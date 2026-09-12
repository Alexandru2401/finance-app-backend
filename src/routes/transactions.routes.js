import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import { getTransactions } from "../controllers/transactions.controller.js";

const transactionsRouter = Router();

transactionsRouter.use(validateToken); // protejeaza tot fisierul

transactionsRouter.get("/", getTransactions);

export default transactionsRouter;
