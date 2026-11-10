import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactions.controller.js";

const transactionsRouter = Router();

transactionsRouter.use(validateToken, rateLimit(100, 15));

transactionsRouter.get("/", getTransactions);

transactionsRouter.post("/", addTransaction);

transactionsRouter.patch("/:id", updateTransaction);

transactionsRouter.delete("/:id", deleteTransaction);

export default transactionsRouter;
