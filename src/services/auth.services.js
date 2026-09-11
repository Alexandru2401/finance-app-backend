import pool from "../db/db.js";

const insertUser = async (email, password) => {
  const response = await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id, username, email, plan_type, is_active, created_at",
    [email, password],
  );

  return response.rows[0];
};

const fetchUserByEmail = async (email) => {
  const response = await pool.query(
    "SELECT user_id, email, plan_type, password FROM users WHERE email=$1",
    [email],
  );

  return response.rows[0];
};

const fetchUserByUsername = async (username) => {
  const response = await pool.query(
    "SELECT user_id, username, password FROM users WHERE username = $1",
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
    "SELECT user_id, email, username FROM users WHERE user_id=$1",
    [id],
  );
  return response.rows[0];
};

const updateUserProfile = async (userId, username, currency) => {
  const response = await pool.query(
    "UPDATE users SET username = $1, currency = $2 WHERE user_id = $3 RETURNING user_id, username, currency",
    [username, currency, userId],
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
  updateUserProfile,
};
