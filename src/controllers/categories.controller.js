import validators from "../validators/inputValidators.js";
import {
  fetchAllCategories,
  addNewCategory,
  fetchCategoryByName,
  fetchUserCategoryById,
  renameUserCategory,
  deleteUserCategory,
} from "../services/categories.services.js";

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await fetchAllCategories(
      req.user.user_id,
      req.query.type,
    );
    res.status(200).json({ success: true, categories });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const TYPES = ["income", "expense", "savings"];

// POST /categories  body: { type, name }
const createNewCategory = async (req, res, next) => {
  try {
    const { type, name } = req.body ?? {};

    if (!TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: income, expense, savings",
      });
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters",
      });
    }

    const alreadyAdded = await fetchCategoryByName(
      req.user.user_id,
      type,
      cleanName,
    );
    if (alreadyAdded) {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }

    const category = await addNewCategory(req.user.user_id, type, cleanName);

    return res.status(201).json({ success: true, category });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }
    console.log(err.message || err);
    next(err);
  }
};

// PATCH /categories/:id  body: { name }
// doar numele se poate schimba; tipul ramane (tranzactiile din categorie au acel tip)
const updateCategory = async (req, res, next) => {
  try {
    const catId = req.params.id;
    const userId = req.user.user_id;

    // id invalid => 404, altfel Postgres arunca eroare de uuid (500)
    if (!validators.isValidUUID(catId)) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const { name } = req.body ?? {};
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters",
      });
    }

    // tipul e necesar pt verificarea de duplicat; implicitele / ale altui user => 404
    const existing = await fetchUserCategoryById(catId, userId);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // aceeasi categorie nu se numara (ex. "sala" -> "Sala" e permis)
    const duplicate = await fetchCategoryByName(
      userId,
      existing.type,
      cleanName,
      catId,
    );
    if (duplicate) {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }

    const category = await renameUserCategory(catId, userId, cleanName);
    if (!category) {
      // stearsa intre timp
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, category });
  } catch (err) {
    // doua request-uri simultane: constraint-ul UNIQUE din db il prinde pe al doilea
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }
    console.log(err.message || err);
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const catId = req.params.id;
    const userId = req.user.user_id;

    if (!validators.isValidUUID(catId)) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const deleted = await deleteUserCategory(catId, userId);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, category: deleted });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export { getAllCategories, createNewCategory, updateCategory, deleteCategory };
