import {
  fetchBudgetItems,
  fetchBudgetItemById,
  fetchCategories,
  fetchBudgetSummary,
  fetchTargetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
} from "../services/budget.services.js";
import { parseMonth } from "../utils/month.js";

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

// ?month=YYYY-MM (aceeasi luna ca la /target); false => format invalid
const invalidMonth = (res) =>
  res.status(400).json({
    success: false,
    message: "Invalid month. Expected format: YYYY-MM",
  });

// cat % din target reprezinta suma reala; null daca nu exista target (sau e <= 0)
const percentOf = (actual, target) =>
  target > 0 ? Math.round((actual / target) * 10000) / 100 : null;

// GET /budget/summary  (?month=2026-10 sau ?period=last-month; month are prioritate, implicit luna curenta)
const getBudgetSummary = async (req, res, next) => {
  try {
    const month = parseMonth(req.query.month);
    if (month === false) return invalidMonth(res);

    const [rows, targetRow] = await Promise.all([
      fetchBudgetSummary(req.user.user_id, req.query.period, month),
      fetchTargetSummary(req.user.user_id, req.query.period, month),
    ]);

    // normalizezi in ceva usor de folosit pe frontend
    const summary = { income: 0, expense: 0, savings: 0 };
    for (const row of rows) {
      summary[row.type] = Number(row.total);
    }
    summary.net = summary.income - summary.expense - summary.savings;

    // target-urile din period (null daca nu e setat) si progresul fata de ele
    const target = {};
    for (const type of ["income", "expense", "savings"]) {
      target[type] = targetRow[type] == null ? null : Number(targetRow[type]);
    }
    target.net =
      target.income == null && target.expense == null && target.savings == null
        ? null
        : (target.income ?? 0) - (target.expense ?? 0) - (target.savings ?? 0);

    summary.target = target;
    summary.progress = {
      income: percentOf(summary.income, target.income),
      expense: percentOf(summary.expense, target.expense),
      savings: percentOf(summary.savings, target.savings),
      net: percentOf(summary.net, target.net),
    };

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

// GET /budget/spending/top  (?month=2026-10 sau ?period=last-month; month are prioritate, implicit luna curenta)
const getTopSpending = async (req, res, next) => {
  try {
    const month = parseMonth(req.query.month);
    if (month === false) return invalidMonth(res);

    const topExpenses = await fetchTopExpenses(
      req.user.user_id,
      5,
      req.query.period,
      month,
    );
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

// GET /budget/budget-trend  (?period=last-6, implicit ultimele 6 luni)
const getBudgetTrend = async (req, res, next) => {
  try {
    const rows = await fetchBudgetTrend(req.user.user_id, req.query.period);

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
