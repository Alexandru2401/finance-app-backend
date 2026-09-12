import {
  fetchBudgetItems,
  fetchBudgetItemById,
  fetchCategories,
  fetchBudgetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
} from "../services/budget.services.js";

// GET /budget  (?type=expense&limit=5)
const getBudgetItems = async (req, res, next) => {
  try {
    const { type, limit } = req.query;

    const items = await fetchBudgetItems(req.user.user_id, {
      type,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({ success: true, items });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/:id
const getBudgetItem = async (req, res, next) => {
  try {
    const item = await fetchBudgetItemById(req.params.id, req.user.user_id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.status(200).json({ success: true, item });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/summary
const getBudgetSummary = async (req, res, next) => {
  try {
    const rows = await fetchBudgetSummary(req.user.user_id);

    // normalizezi in ceva usor de folosit pe frontend
    const summary = { income: 0, expense: 0, savings: 0 };
    for (const row of rows) {
      summary[row.type] = Number(row.total);
    }
    summary.net = summary.income - summary.expense;

    res.status(200).json({ success: true, summary });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/categories  (?type=expense)
const getCategories = async (req, res, next) => {
  try {
    const categories = await fetchCategories(req.user.user_id, req.query.type);
    res.status(200).json({ success: true, categories });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/income
const getIncome = async (req, res, next) => {
  try {
    const items = await fetchBudgetItems(req.user.user_id, { type: "income" });
    res.status(200).json({ success: true, items });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/spending
const getSpending = async (req, res, next) => {
  try {
    const items = await fetchBudgetItems(req.user.user_id, { type: "expense" });
    res.status(200).json({ success: true, items });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/spending/top
const getTopSpending = async (req, res, next) => {
  try {
    const topExpenses = await fetchTopExpenses(req.user.user_id, 5);
    res.status(200).json({ success: true, topExpenses });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/savings
const getSavings = async (req, res, next) => {
  try {
    const items = await fetchBudgetItems(req.user.user_id, { type: "savings" });
    res.status(200).json({ success: true, items });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/budget-trend  (income vs expense pe ultimele 6 luni)
const getBudgetTrend = async (req, res, next) => {
  try {
    const rows = await fetchBudgetTrend(req.user.user_id, 6);

    const trend = rows.map((row) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    }));

    res.status(200).json({ success: true, trend });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export {
  getBudgetItems,
  getBudgetItem,
  getBudgetSummary,
  getCategories,
  getIncome,
  getSpending,
  getTopSpending,
  getSavings,
  getBudgetTrend,
};
