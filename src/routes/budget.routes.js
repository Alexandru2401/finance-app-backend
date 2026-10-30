import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getBudgetSummary,
  getCategories,
  getTopSpending,
  getBudgetTrend,
} from "../controllers/budget.controller.js";

const budgetRouter = Router();

budgetRouter.use(validateToken); // protejeaza tot fisierul

// doar statistici; listele de tranzactii sunt in /transactions
budgetRouter.get("/summary", getBudgetSummary);
budgetRouter.get("/categories", getCategories);
budgetRouter.get("/spending/top", getTopSpending);
budgetRouter.get("/budget-trend", getBudgetTrend);

export default budgetRouter;
