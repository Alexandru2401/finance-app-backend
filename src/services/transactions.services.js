import pool from "../db/db.js";

const MAX_PER_PAGE = 100;
const TYPES = ["income", "expense", "savings"];

// intreg pozitiv valid, altfel fallback (evita NaN/negative ajunse in LIMIT/OFFSET)
const toSafeInt = (value, fallback, max = Infinity) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return Math.min(num, max);
};

const fetchTransactions = async (userId, filters = {}) => {
  const {
    search,
    type, // 'income' | 'expense' | 'savings'
    categoryId,
    year,
    month,
    day,
    minAmount,
    maxAmount,
    sort = "newest", // 'newest' | 'oldest' | 'highest' | 'lowest'
  } = filters;

  const page = toSafeInt(filters.page, 1);
  const perPage = toSafeInt(filters.perPage, 10, MAX_PER_PAGE);

  const conditions = ["b.user_id = $1"];
  const values = [userId];
  let i = 2;

  if (search) {
    conditions.push(`c.name ILIKE $${i++}`);
    values.push(`%${search}%`);
  }
  // fara type (sau "all" / valoare necunoscuta) => toate tipurile
  if (TYPES.includes(type)) {
    conditions.push(`b.type = $${i++}`);
    values.push(type);
  }
  if (categoryId) {
    conditions.push(`b.category_id = $${i++}`);
    values.push(categoryId);
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR  FROM b.date) = $${i++}`);
    values.push(year);
  }
  if (month) {
    conditions.push(`EXTRACT(MONTH FROM b.date) = $${i++}`);
    values.push(month);
  }
  if (day) {
    conditions.push(`EXTRACT(DAY   FROM b.date) = $${i++}`);
    values.push(day);
  }
  if (minAmount != null) {
    conditions.push(`b.amount >= $${i++}`);
    values.push(minAmount);
  }
  if (maxAmount != null) {
    conditions.push(`b.amount <= $${i++}`);
    values.push(maxAmount);
  }

  const where = conditions.join(" AND ");

  const orderBy =
    {
      newest: "b.date DESC",
      oldest: "b.date ASC",
      highest: "b.amount DESC",
      lowest: "b.amount ASC",
    }[sort] ?? "b.date DESC";

  const offset = (page - 1) * perPage;

  const listQuery = `
    SELECT b.item_id, b.type, b.amount, b.date, b.notes,
           b.category_id, c.name AS category_name
    FROM budget_items b
    LEFT JOIN categories c ON c.category_id = b.category_id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT $${i} OFFSET $${i + 1}`;

  const listValues = [...values, perPage, offset];

  // total (număr de rânduri filtrate) + net total, calculate pe TOT setul filtrat, nu doar pagina
  const totalsQuery = `
    SELECT COUNT(*) AS count,
           COALESCE(SUM(CASE WHEN b.type = 'income' THEN b.amount ELSE -b.amount END), 0) AS net
    FROM budget_items b
    LEFT JOIN categories c ON c.category_id = b.category_id
    WHERE ${where}`;

  const [list, totals] = await Promise.all([
    pool.query(listQuery, listValues),
    pool.query(totalsQuery, values),
  ]);

  return {
    rows: list.rows.map((r) => ({ ...r, amount: Number(r.amount) })),
    total: Number(totals.rows[0].count),
    net: Number(totals.rows[0].net),
  };
};

// categoria trebuie sa fie default (user_id NULL) sau a userului
const fetchCategoryForUser = async (categoryId, userId) => {
  const response = await pool.query(
    `SELECT category_id, type, name FROM categories
     WHERE category_id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [categoryId, userId],
  );
  return response.rows[0];
};

const addNewTransaction = async (userId, transaction) => {
  const response = await pool.query(
    `INSERT INTO budget_items (user_id, type, category_id, amount, date, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING item_id, type, category_id, amount, date, notes, created_at`,
    [
      userId,
      transaction.type,
      transaction.categoryId,
      transaction.amount,
      transaction.date,
      transaction.notes,
    ],
  );
  const row = response.rows[0];
  return { ...row, amount: Number(row.amount) };
};

const fetchTransactionById = async (itemId, userId) => {
  const response = await pool.query(
    `SELECT item_id, type, category_id, amount,
            to_char(date, 'YYYY-MM-DD') AS date, notes
     FROM budget_items
     WHERE item_id = $1 AND user_id = $2`,
    [itemId, userId],
  );
  const row = response.rows[0];
  return row ? { ...row, amount: Number(row.amount) } : undefined;
};

const updateTransactionById = async (itemId, userId, transaction) => {
  const response = await pool.query(
    `UPDATE budget_items
     SET type = $1, category_id = $2, amount = $3, date = $4, notes = $5
     WHERE item_id = $6 AND user_id = $7
     RETURNING item_id, type, category_id, amount, date, notes, created_at`,
    [
      transaction.type,
      transaction.categoryId,
      transaction.amount,
      transaction.date,
      transaction.notes,
      itemId,
      userId,
    ],
  );
  const row = response.rows[0];
  return row ? { ...row, amount: Number(row.amount) } : undefined;
};

// true daca s-a sters un rand (tranzactia exista si e a userului)
const deleteTransactionById = async (itemId, userId) => {
  const response = await pool.query(
    `DELETE FROM budget_items WHERE item_id = $1 AND user_id = $2`,
    [itemId, userId],
  );
  return response.rowCount > 0;
};

export {
  fetchTransactions,
  fetchCategoryForUser,
  addNewTransaction,
  fetchTransactionById,
  updateTransactionById,
  deleteTransactionById,
};
