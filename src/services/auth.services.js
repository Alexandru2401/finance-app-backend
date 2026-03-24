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
    "SELECT username FROM id, username, password WHERE username=$1",
    [username],
  );

  return response.rows[0];
};

export { insertUser, fetchUserByEmail, fetchUserByUsername };
