import pool from "../db/db.js";

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

// intervalele presetate din ?period= : [start, end) ca expresii SQL
// calculate in SQL (CURRENT_DATE), ca sa nu depinda de timezone-ul serverului Node
// this-month = toata luna curenta, last-month = toata luna trecuta (nu ultimele 30 de zile)
// last-N = de la inceputul lunii de acum N-1 luni pana azi inclusiv
//   (ex. pe 30 oct, last-3 = 1 aug - 30 oct; tranzactiile cu data in viitor nu intra)
const MONTH_START = `date_trunc('month', CURRENT_DATE)`;
const NEXT_MONTH = `(${MONTH_START} + INTERVAL '1 month')`;
const TOMORROW = `(CURRENT_DATE + INTERVAL '1 day')`;

const PRESET_RANGES = {
  "this-month": { start: MONTH_START, end: NEXT_MONTH },
  "last-month": {
    start: `(${MONTH_START} - INTERVAL '1 month')`,
    end: MONTH_START,
  },
  "last-3": { start: `(${MONTH_START} - INTERVAL '2 months')`, end: TOMORROW },
  "last-6": { start: `(${MONTH_START} - INTERVAL '5 months')`, end: TOMORROW },
  "last-12": {
    start: `(${MONTH_START} - INTERVAL '11 months')`,
    end: TOMORROW,
  },
};

// period vine deja validat din parsePeriod (utils/period.js): { preset } sau { from, to }
// la custom, from/to ('YYYY-MM-DD', to exclusiv) devin parametrii $idx si $idx+1 ai query-ului
const resolveRange = (period, idx) =>
  period.preset
    ? { ...PRESET_RANGES[period.preset], values: [] }
    : {
        start: `$${idx}::date`,
        end: `$${idx + 1}::date`,
        values: [period.from, period.to],
      };

// conditia WHERE pt un interval
const rangeCondition = (range, column = "date") =>
  `${column} >= ${range.start} AND ${column} < ${range.end}`;

// lunile atinse de interval (si cele partiale, ex. la un range pe zile)
const monthsSeries = (range) =>
  `generate_series(
     date_trunc('month', ${range.start}),
     date_trunc('month', ${range.end} - INTERVAL '1 day'),
     INTERVAL '1 month'
   )`;

// sumele pe tip, pt cardurile de overview (income/expenses/savings/net)
const fetchBudgetSummary = async (userId, period) => {
  const range = resolveRange(period, 2);
  const response = await pool.query(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM budget_items
     WHERE user_id = $1 AND ${rangeCondition(range)}
     GROUP BY type`,
    [userId, ...range.values],
  );
  return response.rows;
};

// suma target-urilor din period, pt progresul din summary
// fiecare luna din interval foloseste target-ul ei sau, daca nu are, ultimul dinainte (carry-over)
// la un range pe zile, lunile partiale intra cu target-ul intreg
const fetchTargetSummary = async (userId, period) => {
  const range = resolveRange(period, 2);

  const response = await pool.query(
    `WITH months AS (
       SELECT ${monthsSeries(range)}::date AS month
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
    [userId, ...range.values],
  );
  return response.rows[0];
};

// top N cele mai mari cheltuieli din period
const fetchTopExpenses = async (userId, limit, period) => {
  const range = resolveRange(period, 3);
  const response = await pool.query(
    `SELECT b.item_id, b.category_id, c.name AS category,
            b.amount, b.date, b.notes, b.created_at
     FROM budget_items b
     LEFT JOIN categories c ON c.category_id = b.category_id
     WHERE b.user_id = $1 AND b.type = 'expense'
       AND ${rangeCondition(range, "b.date")}
     ORDER BY b.amount DESC
     LIMIT $2`,
    [userId, limit, ...range.values],
  );
  return response.rows;
};

// income vs expense pe luni, cate un punct pt fiecare luna din period (pt grafic de trend)
// lunile sunt generate direct in SQL (generate_series), ca sa nu depinda
// de timezone-ul serverului Node vs. cel al bazei de date
// la un range pe zile, lunile de la capete contin doar zilele din interval
const fetchBudgetTrend = async (userId, period) => {
  const range = resolveRange(period, 2);

  const response = await pool.query(
    `WITH months AS (
       SELECT ${monthsSeries(range)} AS month
     )
     SELECT to_char(m.month, 'YYYY-MM') AS month,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'income'), 0) AS income,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'expense'), 0) AS expense
     FROM months m
     LEFT JOIN budget_items b
       ON date_trunc('month', b.date) = m.month AND b.user_id = $1
          AND ${rangeCondition(range, "b.date")}
     GROUP BY m.month
     ORDER BY m.month ASC`,
    [userId, ...range.values],
  );
  return response.rows;
};

export {
  fetchCategories,
  fetchBudgetSummary,
  fetchTargetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
};
