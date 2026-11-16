import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";
import {
  getRecurringItems,
  createRecurringItem,
  updateRecurringItemById,
  deleteRecurringItemById,
} from "../controllers/recurring.controller.js";

const recurringRouter = Router();

recurringRouter.use(validateToken, rateLimit(100, 15));

recurringRouter.get("/", getRecurringItems);
recurringRouter.post("/", createRecurringItem);
recurringRouter.patch("/:id", updateRecurringItemById);
recurringRouter.delete("/:id", deleteRecurringItemById);

export default recurringRouter;
