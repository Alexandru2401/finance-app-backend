import {
  fetchTarget,
  fetchAllTargets,
  upsertTarget,
  fetchTargetHistory,
} from "../services/target.services.js";
import { parseMonth } from "../utils/month.js";
import { targetNet } from "../utils/targetNet.js";
import validators from "../validators/inputValidators.js";

const FIELDS = ["income", "expense", "savings"];

// numeric din pg vine ca string -> Number, null ramane null
const toNumber = (value) => (value == null ? null : Number(value));

const formatTarget = (row) => {
  const income = toNumber(row.income);
  const expense = toNumber(row.expense);
  const savings = toNumber(row.savings);

  return {
    id: row.id ?? null,
    month: row.month,
    inheritedFrom: row.inherited_from ?? null, // luna din care e mostenit target-ul
    income,
    expense,
    savings,
    netBalance: targetNet(income, expense),
  };
};

// GET /target  (?month=2026-10, implicit luna curenta)
const getTarget = async (req, res, next) => {
  try {
    const month = parseMonth(req.query.month);
    if (month === false) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Expected format: YYYY-MM",
      });
    }

    const row = await fetchTarget(req.user.user_id, month);

    res.status(200).json({ success: true, target: formatTarget(row) });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// GET /target/all  toate target-urile salvate, cele mai noi primele
const getAllTargets = async (req, res, next) => {
  try {
    const rows = await fetchAllTargets(req.user.user_id);

    res.status(200).json({ success: true, targets: rows.map(formatTarget) });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// POST /target  body: { month?, income?, expense?, savings? }
// creeaza target-ul lunii sau il actualizeaza daca exista deja
const saveTarget = async (req, res, next) => {
  try {
    const body = req.body ?? {};

    const month = parseMonth(body.month);
    if (month === false) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Expected format: YYYY-MM",
      });
    }

    const values = {};
    for (const field of FIELDS) {
      const value = body[field];
      if (value === undefined || value === null || value === "") continue;

      const numeric = Number(value);
      if (!validators.isValidAmount(numeric)) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a number >= 0, with at most 2 decimals and at most 9999999999.99`,
        });
      }
      values[field] = numeric;
    }

    if (Object.keys(values).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one of income, expense, savings is required",
      });
    }

    const row = await upsertTarget(req.user.user_id, month, values);

    res
      .status(row.inserted ? 201 : 200)
      .json({ success: true, target: formatTarget(row) });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// ---- CSV ----
// progresul fata de target, ca la /budget/summary; null fara target
const percentOf = (actual, target) =>
  target > 0 ? Math.round((actual / target) * 10000) / 100 : null;

// BOM: Excel citeste fisierul ca UTF-8 si afiseaza corect diacriticele
const BOM = String.fromCharCode(0xfeff);

// ghilimele cand e nevoie (virgula, ghilimele, rand nou)
const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const HISTORY_LABELS = {
  ro: {
    month: "Lună",
    columns: {
      income: ["Venituri", "Țintă venituri", "Venituri %"],
      expense: ["Cheltuieli", "Țintă cheltuieli", "Cheltuieli %"],
      savings: ["Economii", "Țintă economii", "Economii %"],
      net: ["Net", "Țintă net", "Net %"],
    },
  },
  en: {
    month: "Month",
    columns: {
      income: ["Income", "Income target", "Income %"],
      expense: ["Expenses", "Expenses target", "Expenses %"],
      savings: ["Savings", "Savings target", "Savings %"],
      net: ["Net", "Net target", "Net %"],
    },
  },
};

const money = (value) => (value == null ? "" : value.toFixed(2));

// GET /target/export  (?lang=ro|en)
// o linie pe luna cu target salvat: suma reala, target-ul si progresul (%),
// pentru venituri, cheltuieli, economii si net; gol unde nu exista target
const exportTargetHistory = async (req, res, next) => {
  try {
    const labels = HISTORY_LABELS[req.query.lang] ?? HISTORY_LABELS.en;
    const rows = await fetchTargetHistory(req.user.user_id);

    const lines = [
      [labels.month, ...Object.values(labels.columns).flat()].join(","),
      ...rows.map((row) => {
        const actual = {
          income: Number(row.actual_income),
          expense: Number(row.actual_expense),
          savings: Number(row.actual_savings),
        };
        actual.net = actual.income - actual.expense;

        const target = {
          income: toNumber(row.income),
          expense: toNumber(row.expense),
          savings: toNumber(row.savings),
        };
        target.net = targetNet(target.income, target.expense);

        const cells = Object.keys(labels.columns).flatMap((field) => {
          const pct = percentOf(actual[field], target[field]);
          return [
            money(actual[field]),
            money(target[field]),
            pct == null ? "" : String(pct),
          ];
        });
        return [row.month, ...cells].map((cell) => csvCell(cell)).join(",");
      }),
    ];

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="target-history-${date}.csv"`,
    );
    // BOM: Excel afiseaza corect diacriticele
    res.status(200).send(`${BOM}${lines.join("\r\n")}\r\n`);
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export { exportTargetHistory, getTarget, getAllTargets, saveTarget };
