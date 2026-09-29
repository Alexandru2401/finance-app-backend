import {
  fetchTransactions,
  fetchCategoryForUser,
  addNewTransaction,
  fetchTransactionById,
  updateTransactionById,
  deleteTransactionById,
} from "../services/transactions.services.js";

// GET /transactions  (?type=expense&category_id=..&year=..&month=..&day=..&minAmount=..&maxAmount=..&search=..&sort=newest&page=1&limit=10)
const getTransactions = async (req, res, next) => {
  try {
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
      page,
      limit,
    } = req.query;

    const { rows, total, net } = await fetchTransactions(req.user.user_id, {
      search,
      type,
      categoryId: category_id,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      day: day ? Number(day) : undefined,
      minAmount: minAmount != null ? Number(minAmount) : undefined,
      maxAmount: maxAmount != null ? Number(maxAmount) : undefined,
      sort,
      page,
      perPage: limit,
    });

    res.status(200).json({ success: true, transactions: rows, total, net });
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
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
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
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a positive number",
        });
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
    const category = await fetchCategoryForUser(
      category_id ?? existing.category_id,
      req.user.user_id,
    );
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

    const transaction = await updateTransactionById(
      req.params.id,
      req.user.user_id,
      {
        type: finalType,
        amount: numericAmount ?? existing.amount,
        date: date ?? existing.date,
        categoryId: category.category_id,
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
      transaction: { ...transaction, category_name: category.name },
    });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// DELETE /transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    const deleted = await deleteTransactionById(
      req.params.id,
      req.user.user_id,
    );
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Transaction deleted successfully" });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
