import pool from "../db/db.js";
import { getRatesToRon, getRate } from "./currency.services.js";
import { insertStarterCategories } from "./categories.services.js";

const insertUser = async (email, password, language) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const response = await client.query(
      "INSERT INTO users (email, password, language) VALUES ($1, $2, $3) RETURNING user_id, username, email, plan_type, is_active, created_at, language, currency",
      [email, password, language],
    );
    const user = response.rows[0];

    await insertStarterCategories(client, user.user_id, language);

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const fetchUserByEmail = async (email) => {
  const response = await pool.query(
    "SELECT user_id, username, email, plan_type, is_active, created_at, language, currency, password FROM users WHERE email=$1",
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

// refresh token-ul doar daca exista in db si nu a expirat (logout il sterge)
const fetchRefreshToken = async (token) => {
  const response = await pool.query(
    "SELECT user_id, token FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
    [token],
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

const fetchUserInfoById = async (id) => {
  const response = await pool.query(
    "SELECT user_id, username, email, plan_type, is_active, created_at, language, currency FROM users WHERE user_id=$1",
    [id],
  );
  return response.rows[0];
};

// la schimbarea monedei convertim si toate sumele userului, intr-o singura tranzactie
// campurile sunt optionale: null/undefined pastreaza valoarea curenta
const updateUserProfile = async (
  userId,
  { username, currency: newCurrency, language },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // FOR UPDATE - doua cereri simultane nu pot converti sumele de doua ori
    const { rows } = await client.query(
      "SELECT currency FROM users WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    const oldCurrency = rows[0]?.currency;

    if (newCurrency && oldCurrency && oldCurrency !== newCurrency) {
      // cache de 6h, deci de obicei nu face request in timpul tranzactiei
      const rates = await getRatesToRon();
      const rate = getRate(rates, oldCurrency, newCurrency);

      await client.query(
        "UPDATE budget_items SET amount = ROUND((amount * $1)::numeric, 2) WHERE user_id = $2",
        [rate, userId],
      );
      await client.query(
        `UPDATE budget_targets SET
           income  = ROUND((income  * $1)::numeric, 2),
           expense = ROUND((expense * $1)::numeric, 2),
           savings = ROUND((savings * $1)::numeric, 2)
         WHERE user_id = $2`,
        [rate, userId],
      );
    }

    const response = await client.query(
      `UPDATE users SET username = COALESCE($1, username),
                         currency = COALESCE($2, currency),
                         language = COALESCE($3, language)
       WHERE user_id = $4 RETURNING user_id, username, currency, language`,
      [username ?? null, newCurrency ?? null, language ?? null, userId],
    );

    await client.query("COMMIT");
    return response.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const fetchUserPasswordById = async (id) => {
  const response = await pool.query(
    "SELECT user_id, password FROM users WHERE user_id = $1",
    [id],
  );
  return response.rows[0];
};

// la schimbarea parolei stergem refresh token-urile celorlalte sesiuni;
// keepToken (refresh token-ul cererii curente) ramane valid
const updatePassword = async (userId, hashedPassword, keepToken) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("UPDATE users SET password = $1 WHERE user_id = $2", [
      hashedPassword,
      userId,
    ]);

    if (keepToken) {
      await client.query(
        "DELETE FROM refresh_tokens WHERE user_id = $1 AND token <> $2",
        [userId, keepToken],
      );
    } else {
      await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
        userId,
      ]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export {
  fetchUserPasswordById,
  updatePassword,
  insertUser,
  fetchUserByEmail,
  fetchUserByUsername,
  insertRefreshToken,
  fetchRefreshToken,
  deleteRefreshToken,
  fetchUserById,
  fetchUserInfoById,
  updateUserProfile,
};
