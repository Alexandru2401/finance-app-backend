import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getBudgetItems,
  getBudgetItem,
  getBudgetSummary,
  getCategories,
} from "../controllers/budget.controller.js";

const budgetRouter = Router();

budgetRouter.use(validateToken); // protejeaza tot fisierul

budgetRouter.get("/summary", getBudgetSummary);
budgetRouter.get("/categories", getCategories);
budgetRouter.get("/", getBudgetItems);
budgetRouter.get("/:id", getBudgetItem);

export default budgetRouter;
