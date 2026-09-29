import pool from "../db/db.js";

// toate item-urile unui user, cu numele categoriei (JOIN)
const fetchBudgetItems = async (userId, filters = {}) => {
  const { type, limit, offset = 0 } = filters;
  const values = [userId];
  let query = `
    SELECT b.item_id, b.type, b.category_id, c.name AS category,
           b.title, b.amount, b.date, b.notes, b.created_at
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
            b.title, b.amount, b.date, b.notes, b.created_at
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
  let query = `SELECT category_id, type, name FROM categories WHERE user_id = $1`;

  if (type) {
    query += ` AND type = $2`;
    values.push(type);
  }

  query += ` ORDER BY name ASC`;

  const response = await pool.query(query, values);
  return response.rows;
};

// sumele pe tip, pt cardurile de overview (income/expenses/savings/net)
const fetchBudgetSummary = async (userId) => {
  const response = await pool.query(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM budget_items
     WHERE user_id = $1
     GROUP BY type`,
    [userId],
  );
  return response.rows;
};

// top N cele mai mari cheltuieli
const fetchTopExpenses = async (userId, limit = 5) => {
  const response = await pool.query(
    `SELECT b.item_id, b.category_id, c.name AS category,
            b.title, b.amount, b.date, b.notes, b.created_at
     FROM budget_items b
     LEFT JOIN categories c ON c.category_id = b.category_id
     WHERE b.user_id = $1 AND b.type = 'expense'
     ORDER BY b.amount DESC
     LIMIT $2`,
    [userId, limit],
  );
  return response.rows;
};

// income vs expense pe ultimele N luni (pt grafic de trend)
// lunile sunt generate direct in SQL (generate_series), ca sa nu depinda
// de timezone-ul serverului Node vs. cel al bazei de date
const fetchBudgetTrend = async (userId, months = 6) => {
  const response = await pool.query(
    `WITH months AS (
       SELECT generate_series(
         date_trunc('month', CURRENT_DATE) - ($2 - 1) * INTERVAL '1 month',
         date_trunc('month', CURRENT_DATE),
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
    [userId, months],
  );
  return response.rows;
};

export {
  fetchBudgetItems,
  fetchBudgetItemById,
  fetchCategories,
  fetchBudgetSummary,
  fetchTopExpenses,
  fetchBudgetTrend,
};
