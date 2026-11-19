import { TYPES } from "../utils/types.js";
import validators, { NOTES_MAX_LENGTH } from "../validators/inputValidators.js";
import { MAX_TRANSACTIONS_PER_USER, limitReached } from "../utils/limits.js";
import {
  fetchTransactions,
  fetchTransactionsForExport,
  fetchTransactionYears,
  fetchCategoryForUser,
  countTransactions,
  addNewTransaction,
  fetchTransactionById,
  updateTransactionById,
  deleteTransactionById,
} from "../services/transactions.services.js";

const INVALID_AMOUNT =
  "Amount must be greater than 0, with at most 2 decimals and at most 9999999999.99";

// valorile acceptate in ?sort= (vezi buildTransactionFilters)
const SORTS = ["newest", "oldest", "highest", "lowest"];

// intreg in [min, max] dintr-un parametru din query; null daca e invalid
const toIntInRange = (value, min, max) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const num = Number(value);
  return num >= min && num <= max ? num : null;
};

// suma >= 0 dintr-un parametru din query; null daca e invalida
const toFilterAmount = (value) => {
  if (typeof value !== "string" || value.trim() === "") return null;
  const num = Number(value);
  return validators.isValidAmount(num) ? num : null;
};

// filtrele din query string, comune pentru GET /transactions si /export
// lipsa (sau "" / "all" la type) = fara filtru; o valoare invalida da 400,
// nu 500 din Postgres (ex. ?minAmount=abc, ?category_id=x, ?year=2026a)
// intoarce { filters } sau { error } (mesajul pentru 400)
const parseFilters = (query) => {
  const {
    search,
    type,
    category_id,
    year,
    month,
    day,
    minAmount,
    maxAmount,
    sort,
  } = query;
  const present = (value) => value !== undefined && value !== "";
  const filters = {};

  if (present(search)) {
    if (typeof search !== "string") return { error: "Invalid search" };
    filters.search = search;
  }
  if (present(type) && type !== "all") {
    if (!TYPES.includes(type)) {
      return {
        error: "Invalid type. Must be one of: all, income, expenses, savings",
      };
    }
    filters.type = type;
  }
  if (present(category_id)) {
    if (
      typeof category_id !== "string" ||
      !validators.isValidUUID(category_id)
    ) {
      return { error: "Invalid category_id" };
    }
    filters.categoryId = category_id;
  }

  const ranges = { year: [1, 9999], month: [1, 12], day: [1, 31] };
  for (const [key, value] of Object.entries({ year, month, day })) {
    if (!present(value)) continue;
    const num = toIntInRange(value, ...ranges[key]);
    if (num === null) {
      return {
        error: `Invalid ${key}. Must be an integer between ${ranges[key].join(" and ")}`,
      };
    }
    filters[key] = num;
  }

  for (const [key, value] of Object.entries({ minAmount, maxAmount })) {
    if (!present(value)) continue;
    const num = toFilterAmount(value);
    if (num === null) {
      return {
        error: `Invalid ${key}. Must be a number >= 0, with at most 2 decimals`,
      };
    }
    filters[key] = num;
  }

  if (present(sort)) {
    if (!SORTS.includes(sort)) {
      return { error: `Invalid sort. Must be one of: ${SORTS.join(", ")}` };
    }
    filters.sort = sort;
  }

  return { filters };
};

// GET /transactions  (?type=expenses&category_id=..&year=..&month=..&day=..&minAmount=..&maxAmount=..&search=..&sort=newest&page=1&limit=15)
// limit implicit si maxim 15
const getTransactions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { filters, error } = parseFilters(req.query);
    if (error) return res.status(400).json({ success: false, message: error });

    const {
      rows,
      total,
      net,
      page: currentPage,
      perPage,
      totalPages,
    } = await fetchTransactions(req.user.user_id, {
      ...filters,
      page,
      perPage: limit,
    });

    res.status(200).json({
      success: true,
      transactions: rows,
      total,
      net,
      page: currentPage,
      limit: perPage,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
};

// ---- CSV ----
const CSV_LABELS = {
  ro: {
    header: ["Data", "Tip", "Categorie", "Sumă", "Notițe", "Recurentă"],
    types: { income: "Venit", expenses: "Cheltuială", savings: "Economie" },
    uncategorized: "Fără categorie",
    recurring: { yes: "Da", no: "Nu" },
  },
  en: {
    header: ["Date", "Type", "Category", "Amount", "Notes", "Recurring"],
    types: { income: "Income", expenses: "Expense", savings: "Savings" },
    uncategorized: "Uncategorized",
    recurring: { yes: "Yes", no: "No" },
  },
};

// BOM: Excel citeste fisierul ca UTF-8 si afiseaza corect diacriticele
const BOM = String.fromCharCode(0xfeff);

// Ghilimele cand e nevoie (virgula, ghilimele, rand nou). Textul scris de user
// care incepe cu = + - @ e prefixat cu ' ca Excel sa nu-l execute ca formula
// (CSV injection)
const csvCell = (value, { userText = false } = {}) => {
  let text = value == null ? "" : String(value);
  if (userText && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// GET /transactions/export  (aceleasi filtre ca GET /transactions, fara paginare)
// ?lang=ro|en alege limba capului de tabel; fisier CSV cu BOM, ca Excel sa
// afiseze corect diacriticele
const exportTransactions = async (req, res, next) => {
  try {
    const { filters, error } = parseFilters(req.query);
    if (error) return res.status(400).json({ success: false, message: error });

    const labels = CSV_LABELS[req.query.lang] ?? CSV_LABELS.en;
    const rows = await fetchTransactionsForExport(req.user.user_id, filters);

    const lines = [
      labels.header.join(","),
      ...rows.map((r) =>
        [
          csvCell(r.date),
          csvCell(labels.types[r.type] ?? r.type),
          csvCell(r.category_name ?? labels.uncategorized, { userText: true }),
          csvCell(r.amount.toFixed(2)),
          csvCell(r.notes, { userText: true }),
          // generata dintr-o regula recurenta
          csvCell(r.recurring_id ? labels.recurring.yes : labels.recurring.no),
        ].join(","),
      ),
    ];

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="transactions-${date}.csv"`,
    );
    res.status(200).send(`${BOM}${lines.join("\r\n")}\r\n`);
  } catch (err) {
    next(err);
  }
};

// GET /transactions/years  ->  { years: [2026, 2025] }
// pentru filtrul de an; lista goala daca userul nu are tranzactii
const getTransactionYears = async (req, res, next) => {
  try {
    const years = await fetchTransactionYears(req.user.user_id);
    res.status(200).json({ success: true, years });
  } catch (err) {
    next(err);
  }
};

const { isValidDate } = validators;

// POST /transactions  body: { type, amount, date: "YYYY-MM-DD", category_id, notes?: string | null }
const addTransaction = async (req, res, next) => {
  try {
    const { type, amount, date, category_id, notes } = req.body ?? {};

    if (!type || amount == null || amount === "" || !date || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type, amount, date, category_id",
      });
    }

    if (!TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: income, expenses, savings",
      });
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0 || !validators.isValidAmount(numericAmount)) {
      return res.status(400).json({ success: false, message: INVALID_AMOUNT });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Expected format: YYYY-MM-DD",
      });
    }

    if (!validators.isValidNotes(notes)) {
      return res.status(400).json({
        success: false,
        message: `Notes must be a string or null, at most ${NOTES_MAX_LENGTH} characters`,
      });
    }

    const category = await fetchCategoryForUser(category_id, req.user.user_id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: `Category '${category.name}' belongs to type '${category.type}', not '${type}'`,
      });
    }

    if (
      (await countTransactions(req.user.user_id)) >= MAX_TRANSACTIONS_PER_USER
    ) {
      return limitReached(
        res,
        `You can have at most ${MAX_TRANSACTIONS_PER_USER} transactions`,
      );
    }

    const transaction = await addNewTransaction(req.user.user_id, {
      type,
      amount: numericAmount,
      date,
      categoryId: category.category_id,
      notes: notes?.trim() || null,
    });

    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      transaction: { ...transaction, category_name: category.name },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /transactions/:id  body (partial): { type?, amount?, date?: "YYYY-MM-DD", category_id?, notes?: string | null }
const updateTransaction = async (req, res, next) => {
  try {
    // id invalid => 404, altfel Postgres arunca eroare de uuid (500)
    if (!validators.isValidUUID(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    const { type, amount, date, category_id, notes } = req.body ?? {};

    if (
      type === undefined &&
      amount === undefined &&
      date === undefined &&
      category_id === undefined &&
      notes === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one field to update: type, amount, date, category_id, notes",
      });
    }

    // null sau "" sterge nota
    if (!validators.isValidNotes(notes)) {
      return res.status(400).json({
        success: false,
        message: `Notes must be a string or null, at most ${NOTES_MAX_LENGTH} characters`,
      });
    }

    if (type !== undefined && !TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: income, expenses, savings",
      });
    }

    let numericAmount;
    if (amount !== undefined) {
      numericAmount = amount === "" || amount === null ? NaN : Number(amount);
      if (numericAmount <= 0 || !validators.isValidAmount(numericAmount)) {
        return res
          .status(400)
          .json({ success: false, message: INVALID_AMOUNT });
      }
    }

    if (date !== undefined && !isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Expected format: YYYY-MM-DD",
      });
    }

    if (category_id !== undefined && !category_id) {
      return res
        .status(400)
        .json({ success: false, message: "category_id cannot be empty" });
    }

    const existing = await fetchTransactionById(
      req.params.id,
      req.user.user_id,
    );
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // valorile finale = cele trimise, peste cele existente
    const finalType = type ?? existing.type;
    const finalCategoryId = category_id ?? existing.category_id;

    // tranzactia ramane fara categorie daca aceasta a fost stearsa (ON DELETE SET NULL)
    let category = null;
    if (finalCategoryId) {
      category = await fetchCategoryForUser(finalCategoryId, req.user.user_id);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      if (category.type !== finalType) {
        return res.status(400).json({
          success: false,
          message: `Category '${category.name}' belongs to type '${category.type}', not '${finalType}'`,
        });
      }
    }

    const transaction = await updateTransactionById(
      req.params.id,
      req.user.user_id,
      {
        type: finalType,
        amount: numericAmount ?? existing.amount,
        date: date ?? existing.date,
        categoryId: finalCategoryId,
        notes: notes === undefined ? existing.notes : notes?.trim() || null,
      },
    );
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      transaction: { ...transaction, category_name: category?.name ?? null },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    if (!validators.isValidUUID(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    const deleted = await deleteTransactionById(
      req.params.id,
      req.user.user_id,
    );
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export {
  getTransactions,
  exportTransactions,
  getTransactionYears,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
