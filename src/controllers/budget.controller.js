import {
  fetchBudgetSummary,
  fetchTargetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
  fetchByCategory,
  fetchHealthTotals,
} from "../services/budget.services.js";
import { fetchTarget } from "../services/target.services.js";
import { parsePeriod, PERIOD_PRESETS } from "../utils/period.js";
import { targetNet } from "../utils/targetNet.js";
import { computeBudgetHealth } from "../utils/budgetHealth.js";
import { todayInRomania } from "../utils/recurring.js";
import validators from "../validators/inputValidators.js";

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
    target.net = targetNet(target.income, target.expense);

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
      savings: Number(row.savings),
    }));

    res.status(200).json({ success: true, trend });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const TYPES = ["income", "expense", "savings"];

// GET /budget/by-category?type=expense  (+ ?period= ca la summary; implicit luna curenta)
const getByCategory = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: income, expense, savings",
      });
    }

    const period = parsePeriod(req.query.period);
    if (period === false) return invalidPeriod(res);

    const rows = await fetchByCategory(req.user.user_id, type, period);
    const categories = rows.map((row) => ({
      category_id: row.category_id,
      category: row.category,
      total: Number(row.total),
    }));

    res.status(200).json({ success: true, categories });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// 'YYYY-MM' cu `delta` luni fata de anul/luna date (monthIndex 0-11), in UTC
const monthKey = (year, monthIndex, delta = 0) => {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

// GET /budget/health?today=YYYY-MM-DD  (implicit ziua de azi din Romania)
// scorul 0-100 dupa analitycs.md; score null = nu exista inca o luna completa cu date
const getBudgetHealth = async (req, res, next) => {
  try {
    const { today: todayParam } = req.query;
    if (todayParam !== undefined && !validators.isValidDate(todayParam)) {
      return res.status(400).json({
        success: false,
        message: "Invalid today. Expected format: YYYY-MM-DD",
      });
    }
    const today = todayParam ?? todayInRomania();

    const [year, month, day] = today.split("-").map(Number);
    const monthIndex = month - 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const current = monthKey(year, monthIndex);
    const lastMonth = monthKey(year, monthIndex, -1);

    const [totals, currentTarget, lastTarget] = await Promise.all([
      fetchHealthTotals(req.user.user_id, today),
      fetchTarget(req.user.user_id, `${current}-01`),
      fetchTarget(req.user.user_id, `${lastMonth}-01`),
    ]);

    const byMonth = new Map(totals.map((row) => [row.month, row]));
    const empty = { income: 0, expense: 0, savings: 0, count: 0 };
    // ultimele 3 luni complete, cea mai recenta ultima
    const lastMonths = [-3, -2, -1].map(
      (delta) => byMonth.get(monthKey(year, monthIndex, delta)) ?? empty,
    );

    const health = computeBudgetHealth({
      day,
      daysInMonth,
      spentSoFar: byMonth.get(current)?.expense ?? 0,
      expenseTarget:
        currentTarget?.expense == null ? null : Number(currentTarget.expense),
      lastMonths,
      savingsTarget:
        lastTarget?.savings == null ? null : Number(lastTarget.savings),
    });

    res.status(200).json({
      success: true,
      health: { ...health, month: current, day },
    });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export {
  getBudgetSummary,
  getTopSpending,
  getBudgetTrend,
  getByCategory,
  getBudgetHealth,
};
