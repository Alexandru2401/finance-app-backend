import validators from "../validators/inputValidators.js";
import {
  fetchNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../services/notifications.services.js";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;

// intreg pozitiv valid, altfel fallback (evita NaN/negative ajunse in LIMIT/OFFSET)
const toSafeInt = (value, fallback, max = Infinity) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return Math.min(num, max);
};

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Notification not found" });

// GET /notifications?page=1&limit=20&unread=true
const getNotifications = async (req, res, next) => {
  try {
    const page = toSafeInt(req.query.page, 1);
    const perPage = toSafeInt(req.query.limit, DEFAULT_PER_PAGE, MAX_PER_PAGE);
    const unread = req.query.unread === "true";

    const { rows, total } = await fetchNotifications(req.user.user_id, {
      page,
      perPage,
      unread,
    });

    res.status(200).json({
      success: true,
      notifications: rows,
      total,
      page,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (err) {
    next(err);
  }
};

// GET /notifications/unread-count  ->  { count }
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await countUnreadNotifications(req.user.user_id);
    res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

// PATCH /notifications/:id/read  (idempotent: 204 si daca era deja citita)
const readNotification = async (req, res, next) => {
  try {
    // id invalid => 404, altfel Postgres arunca eroare de uuid (500)
    if (!validators.isValidUUID(req.params.id)) return notFound(res);

    const found = await markNotificationRead(req.params.id, req.user.user_id);
    if (!found) return notFound(res);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// PATCH /notifications/read-all
const readAllNotifications = async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user.user_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// DELETE /notifications/:id
const removeNotification = async (req, res, next) => {
  try {
    if (!validators.isValidUUID(req.params.id)) return notFound(res);

    const deleted = await deleteNotification(req.params.id, req.user.user_id);
    if (!deleted) return notFound(res);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export {
  getNotifications,
  getUnreadCount,
  readNotification,
  readAllNotifications,
  removeNotification,
};
