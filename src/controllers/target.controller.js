import {
  fetchTarget,
  fetchAllTargets,
  upsertTarget,
} from "../services/target.services.js";
import { parseMonth } from "../utils/month.js";

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
    netBalance: (income ?? 0) - (expense ?? 0) - (savings ?? 0),
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
      if (!Number.isFinite(numeric) || numeric < 0) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a number >= 0`,
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

export { getTarget, getAllTargets, saveTarget };
