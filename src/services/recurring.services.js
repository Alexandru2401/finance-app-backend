import pool from "../db/db.js";

// coloanele intoarse la client; next_run ca 'YYYY-MM-DD' (fara ora, ca sa nu se
// mute ziua din cauza fusului orar) si numele categoriei
const SELECT_COLUMNS = `
  r.id, r.type, r.category_id, c.name AS category_name, r.amount, r.notes,
  r.day_of_month, to_char(r.next_run, 'YYYY-MM-DD') AS next_run,
  r.is_active, r.created_at, r.updated_at`;

// numeric din pg vine ca string
const format = (row) => (row ? { ...row, amount: Number(row.amount) } : row);

// regulile userului, cea mai apropiata generare prima
const fetchRecurringItems = async (userId) => {
  const response = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM recurring_items r
     LEFT JOIN categories c ON c.category_id = r.category_id
     WHERE r.user_id = $1
     ORDER BY r.is_active DESC, r.next_run ASC, r.created_at ASC, r.id ASC`,
    [userId],
  );
  return response.rows.map(format);
};

const fetchRecurringItemById = async (id, userId) => {
  const response = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM recurring_items r
     LEFT JOIN categories c ON c.category_id = r.category_id
     WHERE r.id = $1 AND r.user_id = $2`,
    [id, userId],
  );
  return format(response.rows[0]);
};

// regula unei categorii (cel mult una: UNIQUE pe category_id)
const fetchRecurringItemByCategory = async (categoryId, userId) => {
  const response = await pool.query(
    "SELECT id FROM recurring_items WHERE category_id = $1 AND user_id = $2",
    [categoryId, userId],
  );
  return response.rows[0];
};

// pt limita de reguli per user
const countRecurringItems = async (userId) => {
  const response = await pool.query(
    "SELECT COUNT(*)::int AS count FROM recurring_items WHERE user_id = $1",
    [userId],
  );
  return response.rows[0].count;
};

const insertRecurringItem = async (userId, item) => {
  const response = await pool.query(
    `WITH r AS (
       INSERT INTO recurring_items
         (user_id, type, category_id, amount, notes, day_of_month, next_run)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *
     )
     SELECT ${SELECT_COLUMNS}
     FROM r
     LEFT JOIN categories c ON c.category_id = r.category_id`,
    [
      userId,
      item.type,
      item.categoryId,
      item.amount,
      item.notes,
      item.dayOfMonth,
      item.nextRun,
    ],
  );
  return format(response.rows[0]);
};

// regula + prima tranzactie (legata de regula), intr-o singura tranzactie DB:
// se salveaza amandoua sau niciuna
const insertRecurringItemWithTransaction = async (userId, item, date) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ruleResponse = await client.query(
      `INSERT INTO recurring_items
         (user_id, type, category_id, amount, notes, day_of_month, next_run)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        item.type,
        item.categoryId,
        item.amount,
        item.notes,
        item.dayOfMonth,
        item.nextRun,
      ],
    );
    const ruleId = ruleResponse.rows[0].id;

    const transactionResponse = await client.query(
      `INSERT INTO budget_items
         (user_id, type, category_id, amount, date, notes, recurring_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING item_id, type, category_id, amount,
                 to_char(date, 'YYYY-MM-DD') AS date, notes, recurring_id,
                 created_at`,
      [
        userId,
        item.type,
        item.categoryId,
        item.amount,
        date,
        item.notes,
        ruleId,
      ],
    );

    const ruleRow = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM recurring_items r
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE r.id = $1`,
      [ruleId],
    );

    await client.query("COMMIT");
    return {
      recurring: format(ruleRow.rows[0]),
      transaction: format(transactionResponse.rows[0]),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// primeste valorile finale (cele existente peste care s-au pus cele trimise)
const updateRecurringItem = async (id, userId, item) => {
  const response = await pool.query(
    `WITH r AS (
       UPDATE recurring_items
       SET type = $3, category_id = $4, amount = $5, notes = $6,
           day_of_month = $7, next_run = $8, is_active = $9, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *
     )
     SELECT ${SELECT_COLUMNS}
     FROM r
     LEFT JOIN categories c ON c.category_id = r.category_id`,
    [
      id,
      userId,
      item.type,
      item.categoryId,
      item.amount,
      item.notes,
      item.dayOfMonth,
      item.nextRun,
      item.isActive,
    ],
  );
  return format(response.rows[0]);
};

// true daca s-a sters; tranzactiile generate raman (FK ON DELETE SET NULL)
const deleteRecurringItem = async (id, userId) => {
  const response = await pool.query(
    "DELETE FROM recurring_items WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return response.rowCount > 0;
};

export {
  fetchRecurringItems,
  fetchRecurringItemById,
  fetchRecurringItemByCategory,
  countRecurringItems,
  insertRecurringItem,
  insertRecurringItemWithTransaction,
  updateRecurringItem,
  deleteRecurringItem,
};
