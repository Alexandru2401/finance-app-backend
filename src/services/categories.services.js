import pool from "../db/db.js";
import STARTER_CATEGORIES from "../utils/starterCategories.js";

// categoriile userului (pt dropdown-ul din form)
const fetchAllCategories = async (userId, type) => {
  const values = [userId];
  let query = `SELECT category_id, type, name FROM categories
             WHERE user_id = $1`;

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
     RETURNING category_id, type, name`,
    [userId, type, name],
  );
  return response.rows[0];
};

// primeste client-ul tranzactiei din register: userul nu ramane creat fara categorii
const insertStarterCategories = async (client, userId, language) => {
  const placeholders = STARTER_CATEGORIES.map(
    (_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`,
  ).join(", ");
  const values = STARTER_CATEGORIES.flatMap((category) => [
    category.type,
    category[language],
  ]);

  await client.query(
    `INSERT INTO categories (user_id, type, name) VALUES ${placeholders}`,
    [userId, ...values],
  );
};

// cauta o categorie cu acelasi nume si tip, printre cele ale userului
// lower() = nu conteaza literele mari/mici ("Sala" == "sala")
// excludeId (optional, la redenumire) = categoria editata nu se numara ca duplicat
const fetchCategoryByName = async (userId, type, name, excludeId = null) => {
  const response = await pool.query(
    `SELECT category_id, name FROM categories
     WHERE type = $1
       AND lower(name) = lower($2)
       AND user_id = $3
       AND ($4::uuid IS NULL OR category_id <> $4::uuid)
     LIMIT 1`,
    [type, name, userId, excludeId],
  );
  return response.rows[0]; // undefined daca nu exista
};

const fetchUserCategoryById = async (catId, userId) => {
  const response = await pool.query(
    `SELECT category_id, type, name FROM categories
     WHERE category_id = $1 AND user_id = $2`,
    [catId, userId],
  );
  return response.rows[0];
};

// redenumeste o categorie a userului; tipul nu se schimba
// (tranzactiile din categorie trebuie sa ramana de acelasi tip)
const renameUserCategory = async (catId, userId, name) => {
  const response = await pool.query(
    `UPDATE categories SET name = $3
     WHERE category_id = $1 AND user_id = $2
     RETURNING category_id, type, name`,
    [catId, userId, name],
  );
  return response.rows[0];
};

// RETURNING = randul sters; undefined daca nu exista / e a altui user
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
  insertStarterCategories,
  fetchCategoryByName,
  fetchUserCategoryById,
  renameUserCategory,
  deleteUserCategory,
};
