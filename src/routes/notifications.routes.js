import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";
import {
  getNotifications,
  getUnreadCount,
  readNotification,
  readAllNotifications,
  removeNotification,
} from "../controllers/notifications.controller.js";

const notificationsRouter = Router();

// limita mai mare: clopotelul cere numarul la fiecare minut si la fiecare
// schimbare de pagina
notificationsRouter.use(validateToken, rateLimit(300, 15));

notificationsRouter.get("/", getNotifications);
notificationsRouter.get("/unread-count", getUnreadCount);
notificationsRouter.patch("/read-all", readAllNotifications);
notificationsRouter.patch("/:id/read", readNotification);
notificationsRouter.delete("/:id", removeNotification);

export default notificationsRouter;
