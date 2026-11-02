import pool from "../db/db.js";

// categoriile userului (pt dropdown-ul din form)
const fetchAllCategories = async (userId, type) => {
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

const addNewCategory = async (userId, type, name) => {
  const response = await pool.query(
    `INSERT INTO categories (user_id, type, name)
     VALUES ($1, $2, $3)
     RETURNING category_id, type, name, key`,
    [userId, type, name],
  );
  return response.rows[0];
};

// cauta o categorie cu acelasi nume si tip, printre cele ale userului SI cele implicite
// lower() = nu conteaza literele mari/mici ("Sala" == "sala")
// excludeId (optional, la redenumire) = categoria editata nu se numara ca duplicat
const fetchCategoryByName = async (userId, type, name, excludeId = null) => {
  const response = await pool.query(
    `SELECT category_id, name, key FROM categories
     WHERE type = $1
       AND lower(name) = lower($2)
       AND (user_id = $3 OR user_id IS NULL)
       AND ($4::uuid IS NULL OR category_id <> $4::uuid)
     LIMIT 1`,
    [type, name, userId, excludeId],
  );
  return response.rows[0]; // undefined daca nu exista
};

// o categorie custom a userului (cele implicite au user_id NULL, deci nu se potrivesc)
const fetchUserCategoryById = async (catId, userId) => {
  const response = await pool.query(
    `SELECT category_id, type, name, key FROM categories
     WHERE category_id = $1 AND user_id = $2`,
    [catId, userId],
  );
  return response.rows[0];
};

// redenumeste doar o categorie custom a userului; tipul nu se schimba
// (tranzactiile din categorie trebuie sa ramana de acelasi tip)
const renameUserCategory = async (catId, userId, name) => {
  const response = await pool.query(
    `UPDATE categories SET name = $3
     WHERE category_id = $1 AND user_id = $2
     RETURNING category_id, type, name, key`,
    [catId, userId, name],
  );
  return response.rows[0];
};

// sterge doar o categorie custom a userului (cele implicite au user_id NULL, deci nu se potrivesc)
// RETURNING = randul sters; undefined daca nu exista / e implicita / e a altui user
// tranzactiile din categorie raman fara categorie (FK ON DELETE SET NULL)
const deleteUserCategory = async (catId, userId) => {
  const response = await pool.query(
    `DELETE FROM categories
     WHERE category_id = $1 AND user_id = $2
     RETURNING category_id, type, name`,
    [catId, userId],
  );
  return response.rows[0];
};

export {
  fetchAllCategories,
  addNewCategory,
  fetchCategoryByName,
  fetchUserCategoryById,
  renameUserCategory,
  deleteUserCategory,
};
