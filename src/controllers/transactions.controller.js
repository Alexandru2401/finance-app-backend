import validators from "../validators/inputValidators.js";
import {
  fetchTransactions,
  fetchTransactionsForExport,
  fetchTransactionYears,
  fetchCategoryForUser,
  addNewTransaction,
  fetchTransactionById,
  updateTransactionById,
  deleteTransactionById,
} from "../services/transactions.services.js";

const INVALID_AMOUNT =
  "Amount must be greater than 0, with at most 2 decimals and at most 9999999999.99";

// filtrele din query string, comune pentru GET /transactions si /export
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
  return {
    search,
    type,
    categoryId: category_id,
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
    day: day ? Number(day) : undefined,
    minAmount: minAmount != null ? Number(minAmount) : undefined,
    maxAmount: maxAmount != null ? Number(maxAmount) : undefined,
    sort,
  };
};

// GET /transactions  (?type=expense&category_id=..&year=..&month=..&day=..&minAmount=..&maxAmount=..&search=..&sort=newest&page=1&limit=15)
// limit implicit si maxim 15
const getTransactions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const {
      rows,
      total,
      net,
      page: currentPage,
      perPage,
      totalPages,
    } = await fetchTransactions(req.user.user_id, {
      ...parseFilters(req.query),
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
    console.log(err.message || err);
    next(err);
  }
};

// ---- CSV ----
const CSV_LABELS = {
  ro: {
    header: ["Data", "Tip", "Categorie", "Sumă", "Notițe"],
    types: { income: "Venit", expense: "Cheltuială", savings: "Economie" },
    uncategorized: "Fără categorie",
  },
  en: {
    header: ["Date", "Type", "Category", "Amount", "Notes"],
    types: { income: "Income", expense: "Expense", savings: "Savings" },
    uncategorized: "Uncategorized",
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
    const labels = CSV_LABELS[req.query.lang] ?? CSV_LABELS.en;
    const rows = await fetchTransactionsForExport(
      req.user.user_id,
      parseFilters(req.query),
    );

    const lines = [
      labels.header.join(","),
      ...rows.map((r) =>
        [
          csvCell(r.date),
          csvCell(labels.types[r.type] ?? r.type),
          csvCell(r.category_name ?? labels.uncategorized, { userText: true }),
          csvCell(r.amount.toFixed(2)),
          csvCell(r.notes, { userText: true }),
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
    console.log(err.message || err);
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
    console.log(err.message || err);
    next(err);
  }
};

const TYPE = ["income", "expense", "savings"];

// data in format YYYY-MM-DD si care exista in calendar (ex. respinge 2026-02-31)
const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

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

    if (!TYPE.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: income, expense, savings",
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

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string or null",
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
    console.log(err.message || err);
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
    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string or null",
      });
    }

    if (type !== undefined && !TYPE.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: income, expense, savings",
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
    console.log(err.message || err);
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
    console.log(err.message || err);
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
