import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getTransactions,
  addTransaction,
} from "../controllers/transactions.controller.js";

const transactionsRouter = Router();

transactionsRouter.use(validateToken); // protejeaza tot fisierul

transactionsRouter.get("/", getTransactions);

transactionsRouter.post("/", addTransaction);

export default transactionsRouter;
