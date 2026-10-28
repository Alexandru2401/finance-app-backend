import pool from "../db/db.js";

// toate item-urile unui user, cu numele categoriei (JOIN)
const fetchBudgetItems = async (userId, filters = {}) => {
  const { type, limit, offset = 0 } = filters;
  const values = [userId];
  let query = `
    SELECT b.item_id, b.type, b.category_id, c.name AS category,
           b.amount, b.date, b.notes, b.created_at
    FROM budget_items b
    LEFT JOIN categories c ON c.category_id = b.category_id
    WHERE b.user_id = $1
  `;
  let i = 2;

  if (type) {
    query += ` AND b.type = $${i}`;
    values.push(type);
    i++;
  }

  query += ` ORDER BY b.date DESC`;

  if (limit) {
    query += ` LIMIT $${i} OFFSET $${i + 1}`;
    values.push(limit, offset);
  }

  const response = await pool.query(query, values);
  return response.rows;
};

// un singur item (verifica si ca apartine userului)
const fetchBudgetItemById = async (itemId, userId) => {
  const response = await pool.query(
    `SELECT b.item_id, b.type, b.category_id, c.name AS category,
            b.amount, b.date, b.notes, b.created_at
     FROM budget_items b
     LEFT JOIN categories c ON c.category_id = b.category_id
     WHERE b.item_id = $1 AND b.user_id = $2`,
    [itemId, userId],
  );
  return response.rows[0];
};

// categoriile userului (pt dropdown-ul din form)
const fetchCategories = async (userId, type) => {
  const values = [userId];
  let query = `SELECT category_id, type, name, key FROM categories
             WHERE (user_id = $1 OR user_id IS NULL)`;

  if (type) {
    query += ` AND type = $2`;
    values.push(type);
  }

  query += ` ORDER BY name ASC`;

  const response = await pool.query(query, values);
  return response.rows;
};

// intervalele de timp acceptate in ?period= : [start, end) ca expresii SQL
// calculate in SQL (CURRENT_DATE), ca sa nu depinda de timezone-ul serverului Node
// lunile sunt calendaristice: last-month = toata luna trecuta, nu ultimele 30 de zile
const MONTH_START = `date_trunc('month', CURRENT_DATE)`;
const NEXT_MONTH = `(${MONTH_START} + INTERVAL '1 month')`;

const PERIOD_RANGES = {
  "this-month": { start: MONTH_START, end: NEXT_MONTH },
  "last-month": {
    start: `(${MONTH_START} - INTERVAL '1 month')`,
    end: MONTH_START,
  },
  "last-3": { start: `(${MONTH_START} - INTERVAL '2 months')`, end: NEXT_MONTH },
  "last-6": { start: `(${MONTH_START} - INTERVAL '5 months')`, end: NEXT_MONTH },
  "this-year": { start: `date_trunc('year', CURRENT_DATE)`, end: NEXT_MONTH },
};

// doar cheile proprii (ex: "constructor" nu e un period valid)
const getPeriodRange = (period) =>
  Object.hasOwn(PERIOD_RANGES, period) ? PERIOD_RANGES[period] : undefined;

// interval pt o luna aleasa (?month=YYYY-MM), data 'YYYY-MM-01' e parametrul $idx al query-ului
// month are prioritate fata de period, ca summary-ul sa fie pe aceeasi luna ca /target
// fara niciunul (sau period necunoscut) => luna curenta, ca la /target
const monthRange = (idx) => ({
  start: `$${idx}::date`,
  end: `($${idx}::date + INTERVAL '1 month')`,
});

const resolveRange = (period, month, idx) =>
  month
    ? monthRange(idx)
    : (getPeriodRange(period) ?? PERIOD_RANGES["this-month"]);

// conditia WHERE pt un interval
const rangeCondition = (range, column = "date") =>
  `${column} >= ${range.start} AND ${column} < ${range.end}`;

// sumele pe tip, pt cardurile de overview (income/expenses/savings/net)
// month (YYYY-MM-01) sau period; fara niciunul => luna curenta
const fetchBudgetSummary = async (userId, period, month) => {
  const range = resolveRange(period, month, 2);
  const response = await pool.query(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM budget_items
     WHERE user_id = $1 AND ${rangeCondition(range)}
     GROUP BY type`,
    month ? [userId, month] : [userId],
  );
  return response.rows;
};

// suma target-urilor din month/period, pt progresul din summary
// fiecare luna din interval foloseste target-ul ei sau, daca nu are, ultimul dinainte (carry-over)
const fetchTargetSummary = async (userId, period, month) => {
  const range = resolveRange(period, month, 2);

  const response = await pool.query(
    `WITH months AS (
       SELECT generate_series(
         ${range.start},
         ${range.end} - INTERVAL '1 month',
         INTERVAL '1 month'
       )::date AS month
     )
     SELECT SUM(t.income) AS income, SUM(t.expense) AS expense,
            SUM(t.savings) AS savings
     FROM months m
     LEFT JOIN LATERAL (
       SELECT income, expense, savings FROM budget_targets
       WHERE user_id = $1 AND month <= m.month
       ORDER BY month DESC
       LIMIT 1
     ) t ON TRUE`,
    month ? [userId, month] : [userId],
  );
  return response.rows[0];
};

// top N cele mai mari cheltuieli (optional doar din month/period)
const fetchTopExpenses = async (userId, limit = 5, period, month) => {
  const range = resolveRange(period, month, 3);
  const response = await pool.query(
    `SELECT b.item_id, b.category_id, c.name AS category,
            b.amount, b.date, b.notes, b.created_at
     FROM budget_items b
     LEFT JOIN categories c ON c.category_id = b.category_id
     WHERE b.user_id = $1 AND b.type = 'expense'
       AND ${rangeCondition(range, "b.date")}
     ORDER BY b.amount DESC
     LIMIT $2`,
    month ? [userId, limit, month] : [userId, limit],
  );
  return response.rows;
};

// income vs expense pe luni, cate un punct pt fiecare luna din period (pt grafic de trend)
// fara period (sau valoare necunoscuta) => ultimele 6 luni
// lunile sunt generate direct in SQL (generate_series), ca sa nu depinda
// de timezone-ul serverului Node vs. cel al bazei de date
const fetchBudgetTrend = async (userId, period) => {
  const range = getPeriodRange(period) ?? PERIOD_RANGES["last-6"];

  const response = await pool.query(
    `WITH months AS (
       SELECT generate_series(
         ${range.start},
         ${range.end} - INTERVAL '1 month',
         INTERVAL '1 month'
       ) AS month
     )
     SELECT to_char(m.month, 'YYYY-MM') AS month,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'income'), 0) AS income,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'expense'), 0) AS expense
     FROM months m
     LEFT JOIN budget_items b
       ON date_trunc('month', b.date) = m.month AND b.user_id = $1
     GROUP BY m.month
     ORDER BY m.month ASC`,
    [userId],
  );
  return response.rows;
};

export {
  fetchBudgetItems,
  fetchBudgetItemById,
  fetchCategories,
  fetchBudgetSummary,
  fetchTargetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
};
