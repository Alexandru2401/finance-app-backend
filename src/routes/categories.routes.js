import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";
import {
  getAllCategories,
  createNewCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categories.controller.js";

const categoriesRouter = Router();

categoriesRouter.use(validateToken, rateLimit(100, 15));

categoriesRouter.get("/", getAllCategories);
categoriesRouter.post("/", createNewCategory);
categoriesRouter.patch("/:id", updateCategory);
categoriesRouter.delete("/:id", deleteCategory);

export default categoriesRouter;
