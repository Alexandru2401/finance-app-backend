import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactions.controller.js";

const transactionsRouter = Router();

transactionsRouter.use(validateToken); // protejeaza tot fisierul

transactionsRouter.get("/", getTransactions);

transactionsRouter.post("/", addTransaction);

transactionsRouter.patch("/:id", updateTransaction);

transactionsRouter.delete("/:id", deleteTransaction);

export default transactionsRouter;
