import pool from "../db/db.js";

// notificarile din aplicatie (notification.md, N1)
// in data se salveaza valorile, nu textul: FE-ul le traduce si formateaza suma

const COLUMNS = "id, type, data, read_at, created_at";

// lista paginata, cele mai noi primele; unread = doar cele necitite
const fetchNotifications = async (userId, { page, perPage, unread }) => {
  const where = `user_id = $1${unread ? " AND read_at IS NULL" : ""}`;
  const offset = (page - 1) * perPage;

  const [list, totals] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS}
       FROM notifications
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [userId, perPage, offset],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE ${where}`,
      [userId],
    ),
  ]);

  return { rows: list.rows, total: totals.rows[0].count };
};

// numarul de pe clopotel
const countUnreadNotifications = async (userId) => {
  const response = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return response.rows[0].count;
};

// true daca notificarea exista si e a userului (si daca era deja citita)
// read_at ramane cel de la prima citire
const markNotificationRead = async (id, userId) => {
  const response = await pool.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return response.rowCount > 0;
};

const markAllNotificationsRead = async (userId) => {
  await pool.query(
    `UPDATE notifications
     SET read_at = now()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
};

// true daca s-a sters (exista si e a userului)
const deleteNotification = async (id, userId) => {
  const response = await pool.query(
    "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return response.rowCount > 0;
};

// pt generarea automata (G1): primeste client-ul tranzactiei DB, ca
// notificarea sa se salveze impreuna cu tranzactia generata; fara client
// foloseste pool-ul
const createNotification = async (userId, type, data = {}, client = pool) => {
  const response = await client.query(
    `INSERT INTO notifications (user_id, type, data)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [userId, type, JSON.stringify(data)],
  );
  return response.rows[0];
};

export {
  fetchNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  createNotification,
};
