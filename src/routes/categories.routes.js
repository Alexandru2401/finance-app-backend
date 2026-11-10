import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getAllCategories,
  createNewCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categories.controller.js";

const categoriesRouter = Router();

categoriesRouter.use(validateToken);

categoriesRouter.get("/", getAllCategories);
categoriesRouter.post("/", createNewCategory);
categoriesRouter.patch("/:id", updateCategory);
categoriesRouter.delete("/:id", deleteCategory);

export default categoriesRouter;
