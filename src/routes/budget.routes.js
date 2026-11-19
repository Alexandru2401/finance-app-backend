import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";
import {
  getBudgetSummary,
  getTopSpending,
  getBudgetTrend,
  getByCategory,
  getBudgetHealth,
  getBudgetCosts,
  getBudgetForecast,
} from "../controllers/budget.controller.js";

const budgetRouter = Router();

budgetRouter.use(validateToken, rateLimit(300, 15));

// doar statistici; listele de tranzactii sunt in /transactions
budgetRouter.get("/summary", getBudgetSummary);
budgetRouter.get("/spending/top", getTopSpending);
budgetRouter.get("/budget-trend", getBudgetTrend);
budgetRouter.get("/by-category", getByCategory);
budgetRouter.get("/health", getBudgetHealth);
budgetRouter.get("/costs", getBudgetCosts);
budgetRouter.get("/forecast", getBudgetForecast);

export default budgetRouter;
