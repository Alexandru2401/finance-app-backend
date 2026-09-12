import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getBudgetItems,
  getBudgetItem,
  getBudgetSummary,
  getCategories,
  getIncome,
  getSpending,
  getTopSpending,
  getSavings,
  getBudgetTrend,
} from "../controllers/budget.controller.js";

const budgetRouter = Router();

budgetRouter.use(validateToken); // protejeaza tot fisierul

budgetRouter.get("/summary", getBudgetSummary);
budgetRouter.get("/categories", getCategories);
budgetRouter.get("/income", getIncome);
budgetRouter.get("/spending", getSpending);
budgetRouter.get("/spending/top", getTopSpending);
budgetRouter.get("/savings", getSavings);
budgetRouter.get("/budget-trend", getBudgetTrend);
budgetRouter.get("/", getBudgetItems);
budgetRouter.get("/:id", getBudgetItem);

export default budgetRouter;
