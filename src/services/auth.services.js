import pool from "../db/db.js";

const insertUser = async (username, email, password) => {
  const response = await pool.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, plan_type, is_active, is_verified, created_at",
    [username, email, password],
  );

  return response.rows[0];
};

const fetchUserByEmail = async (email) => {
  const response = await pool.query(
    "SELECT id, email, password FROM users WHERE email=$1",
    [email],
  );

  return response.rows[0];
};

const fetchUserByUsername = async (username) => {
  const response = await pool.query(
    "SELECT id, username, password FROM users WHERE username = $1",
    [username],
  );
  return response.rows[0];
};

const insertRefreshToken = async (userId, refreshToken, expires_at) => {
  const response = await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING user_id, token",
    [userId, refreshToken, expires_at],
  );

  return response.rows[0];
};

const deleteRefreshToken = async (token) => {
  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
};

const fetchUserById = async (id) => {
  const response = await pool.query(
    "SELECT id, email, username FROM users WHERE id=$1",
    [id],
  );
  return response.rows[0];
};

export {
  insertUser,
  fetchUserByEmail,
  fetchUserByUsername,
  insertRefreshToken,
  deleteRefreshToken,
  fetchUserById,
};
