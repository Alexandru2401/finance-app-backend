import {
  fetchCategories,
  fetchBudgetSummary,
  fetchTargetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
} from "../services/budget.services.js";
import { parsePeriod, PERIOD_PRESETS } from "../utils/period.js";

// ?period= invalid (vezi utils/period.js)
const invalidPeriod = (res) =>
  res.status(400).json({
    success: false,
    message: `Invalid period. Allowed: ${PERIOD_PRESETS.join(", ")}, YYYY-MM:YYYY-MM or YYYY-MM-DD:YYYY-MM-DD`,
  });

// cat % din target reprezinta suma reala; null daca nu exista target (sau e <= 0)
const percentOf = (actual, target) =>
  target > 0 ? Math.round((actual / target) * 10000) / 100 : null;

// GET /budget/summary  (?period=last-3 sau ?period=2026-01:2026-03; implicit luna curenta)
const getBudgetSummary = async (req, res, next) => {
  try {
    const period = parsePeriod(req.query.period);
    if (period === false) return invalidPeriod(res);

    const [rows, targetRow] = await Promise.all([
      fetchBudgetSummary(req.user.user_id, period),
      fetchTargetSummary(req.user.user_id, period),
    ]);

    // normalizezi in ceva usor de folosit pe frontend
    const summary = { income: 0, expense: 0, savings: 0 };
    for (const row of rows) {
      summary[row.type] = Number(row.total);
    }
    // net = venituri - cheltuieli (economiile nu se scad)
    summary.net = summary.income - summary.expense;

    // target-urile din period (null daca nu e setat) si progresul fata de ele
    const target = {};
    for (const type of ["income", "expense", "savings"]) {
      target[type] = targetRow[type] == null ? null : Number(targetRow[type]);
    }
    target.net =
      target.income == null && target.expense == null
        ? null
        : (target.income ?? 0) - (target.expense ?? 0);

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

// GET /budget/spending/top  (?period=last-3 sau ?period=2026-01:2026-03; implicit luna curenta)
const getTopSpending = async (req, res, next) => {
  try {
    const period = parsePeriod(req.query.period);
    if (period === false) return invalidPeriod(res);

    const topExpenses = await fetchTopExpenses(req.user.user_id, 5, period);
    res.status(200).json({ success: true, topExpenses });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /budget/budget-trend  (?period=last-12 sau ?period=2026-01:2026-06; implicit ultimele 6 luni)
const getBudgetTrend = async (req, res, next) => {
  try {
    const period = parsePeriod(req.query.period, "last-6");
    if (period === false) return invalidPeriod(res);

    const rows = await fetchBudgetTrend(req.user.user_id, period);

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

export { getBudgetSummary, getCategories, getTopSpending, getBudgetTrend };
