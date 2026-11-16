import validators from "../validators/inputValidators.js";
import { fetchCategoryForUser } from "../services/transactions.services.js";
import {
  fetchRecurringItems,
  fetchRecurringItemById,
  fetchRecurringItemByCategory,
  countRecurringItems,
  insertRecurringItem,
  insertRecurringItemWithTransaction,
  updateRecurringItem,
  deleteRecurringItem,
} from "../services/recurring.services.js";
import { nextRunDate, todayInRomania } from "../utils/recurring.js";

// o categorie are cel mult o regula (UNIQUE pe category_id)
const CATEGORY_TAKEN = "This category already has a recurring item";
const categoryTaken = (res) =>
  res.status(409).json({ success: false, message: CATEGORY_TAKEN });

// doua cereri simultane: indexul UNIQUE din db o prinde pe a doua
const isUniqueViolation = (err) => err?.code === "23505";

const TYPES = ["income", "expense", "savings"];

// limita de reguli per user (security.md 1.8)
const MAX_RECURRING_PER_USER = 50;

// la fel ca in formularul din FE si ca CHECK-ul din DB
const NOTES_MAX_LENGTH = 1500;

const INVALID_AMOUNT =
  "Amount must be greater than 0, with at most 2 decimals and at most 9999999999.99";

const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

const notFound = (res, message = "Recurring item not found") =>
  res.status(404).json({ success: false, message });

// undefined = netrimis; null = ziua 1; altfel intreg 1-31 (numar sau string "15")
// intoarce false daca e invalid
const parseDayOfMonth = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return false;
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : false;
};

// undefined = netrimis; altfel string trim-uit sau null ("" sterge nota)
// intoarce false daca e invalid
const parseNotes = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return false;
  const notes = value.trim();
  if (notes.length > NOTES_MAX_LENGTH) return false;
  return notes || null;
};

// numar valid > 0 sau false
const parseAmount = (value) => {
  if (value === null || value === "") return false;
  const amount = Number(value);
  return amount > 0 && validators.isValidAmount(amount) ? amount : false;
};

// categoria trebuie sa fie a userului si de acelasi tip
// intoarce { category } sau { error: [status, message] }
const checkCategory = async (categoryId, userId, type) => {
  if (typeof categoryId !== "string" || !validators.isValidUUID(categoryId)) {
    return { error: [400, "category_id is not valid"] };
  }
  const category = await fetchCategoryForUser(categoryId, userId);
  if (!category) return { error: [404, "Category not found"] };
  if (category.type !== type) {
    return {
      error: [
        400,
        `Category '${category.name}' belongs to type '${category.type}', not '${type}'`,
      ],
    };
  }
  return { category };
};

// GET /recurring
const getRecurringItems = async (req, res, next) => {
  try {
    const recurring = await fetchRecurringItems(req.user.user_id);
    res.status(200).json({ success: true, recurring });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// POST /recurring  body: { type, category_id, amount, notes?, day_of_month?, date? }
// - day_of_month lipsa / null = ziua 1 a lunii urmatoare
// - date ('YYYY-MM-DD', optional) = creeaza si prima tranzactie, in aceeasi zi,
//   legata de regula (badge-ul din FE); regula + tranzactia se salveaza impreuna
const createRecurringItem = async (req, res, next) => {
  try {
    const { type, category_id, amount, notes, day_of_month, date } =
      req.body ?? {};
    const userId = req.user.user_id;

    if (!type || amount == null || amount === "" || !category_id) {
      return badRequest(
        res,
        "Missing required fields: type, amount, category_id",
      );
    }

    if (!TYPES.includes(type)) {
      return badRequest(
        res,
        "Invalid type. Must be one of: income, expense, savings",
      );
    }

    const numericAmount = parseAmount(amount);
    if (numericAmount === false) return badRequest(res, INVALID_AMOUNT);

    const cleanNotes = parseNotes(notes);
    if (cleanNotes === false) {
      return badRequest(
        res,
        `Notes must be a string or null, at most ${NOTES_MAX_LENGTH} characters`,
      );
    }

    const dayOfMonth = parseDayOfMonth(day_of_month);
    if (dayOfMonth === false) {
      return badRequest(res, "day_of_month must be an integer from 1 to 31");
    }

    if (date !== undefined && !validators.isValidDate(date)) {
      return badRequest(res, "Invalid date. Expected format: YYYY-MM-DD");
    }

    const { error } = await checkCategory(category_id, userId, type);
    if (error) {
      return res.status(error[0]).json({ success: false, message: error[1] });
    }

    if (await fetchRecurringItemByCategory(category_id, userId)) {
      return categoryTaken(res);
    }

    if ((await countRecurringItems(userId)) >= MAX_RECURRING_PER_USER) {
      return res.status(409).json({
        success: false,
        message: `You can have at most ${MAX_RECURRING_PER_USER} recurring items`,
      });
    }

    // urmatoarea generare e dupa azi si dupa prima tranzactie (daca e in viitor),
    // ca aceeasi zi sa nu fie adaugata de doua ori
    const today = todayInRomania();
    const from = date && date > today ? date : today;

    const item = {
      type,
      categoryId: category_id,
      amount: numericAmount,
      notes: cleanNotes ?? null,
      dayOfMonth: dayOfMonth ?? null,
      nextRun: nextRunDate(dayOfMonth ?? null, from),
    };

    if (date === undefined) {
      const recurring = await insertRecurringItem(userId, item);
      return res.status(201).json({ success: true, recurring });
    }

    const { recurring, transaction } = await insertRecurringItemWithTransaction(
      userId,
      item,
      date,
    );
    res.status(201).json({
      success: true,
      recurring,
      transaction: { ...transaction, category_name: recurring.category_name },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return categoryTaken(res);
    console.log(err.message || err);
    next(err);
  }
};

// PATCH /recurring/:id  body (partial):
//   { type?, category_id?, amount?, notes?, day_of_month?, is_active? }
// - schimbarile afecteaza doar tranzactiile viitoare (cele generate raman)
// - day_of_month schimbat => next_run recalculat de azi
// - reluarea dupa pauza (is_active: true) => next_run recalculat de azi,
//   fara sa genereze lunile din pauza
const updateRecurringItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // id invalid => 404, altfel Postgres arunca eroare de uuid (500)
    if (!validators.isValidUUID(id)) return notFound(res);

    const { type, category_id, amount, notes, day_of_month, is_active } =
      req.body ?? {};

    if (
      [type, category_id, amount, notes, day_of_month, is_active].every(
        (value) => value === undefined,
      )
    ) {
      return badRequest(
        res,
        "Provide at least one field to update: type, category_id, amount, notes, day_of_month, is_active",
      );
    }

    if (type !== undefined && !TYPES.includes(type)) {
      return badRequest(
        res,
        "Invalid type. Must be one of: income, expense, savings",
      );
    }

    let numericAmount;
    if (amount !== undefined) {
      numericAmount = parseAmount(amount);
      if (numericAmount === false) return badRequest(res, INVALID_AMOUNT);
    }

    const cleanNotes = parseNotes(notes);
    if (cleanNotes === false) {
      return badRequest(
        res,
        `Notes must be a string or null, at most ${NOTES_MAX_LENGTH} characters`,
      );
    }

    const dayOfMonth = parseDayOfMonth(day_of_month);
    if (dayOfMonth === false) {
      return badRequest(res, "day_of_month must be an integer from 1 to 31");
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return badRequest(res, "is_active must be true or false");
    }

    if (category_id !== undefined && !category_id) {
      return badRequest(res, "category_id cannot be empty");
    }

    const existing = await fetchRecurringItemById(id, userId);
    if (!existing) return notFound(res);

    const finalType = type ?? existing.type;
    const finalCategoryId = category_id ?? existing.category_id;
    const finalIsActive = is_active ?? existing.is_active;
    const finalDay =
      dayOfMonth === undefined ? existing.day_of_month : dayOfMonth;

    // categoria e obligatorie (NOT NULL); la mutarea pe alta categorie,
    // aceea nu trebuie sa aiba deja o regula
    if (category_id !== undefined || type !== undefined) {
      const { error } = await checkCategory(finalCategoryId, userId, finalType);
      if (error) {
        return res.status(error[0]).json({ success: false, message: error[1] });
      }
    }
    if (finalCategoryId !== existing.category_id) {
      const taken = await fetchRecurringItemByCategory(finalCategoryId, userId);
      if (taken) return categoryTaken(res);
    }

    const resumed = finalIsActive && !existing.is_active;
    const dayChanged = finalDay !== existing.day_of_month;

    const recurring = await updateRecurringItem(id, userId, {
      type: finalType,
      categoryId: finalCategoryId,
      amount: numericAmount ?? existing.amount,
      notes: cleanNotes === undefined ? existing.notes : cleanNotes,
      dayOfMonth: finalDay,
      nextRun:
        resumed || dayChanged ? nextRunDate(finalDay) : existing.next_run,
      isActive: finalIsActive,
    });
    if (!recurring) return notFound(res); // sters intre timp

    res.status(200).json({ success: true, recurring });
  } catch (err) {
    if (isUniqueViolation(err)) return categoryTaken(res);
    console.log(err.message || err);
    next(err);
  }
};

// DELETE /recurring/:id  tranzactiile generate deja raman, fara legatura
const deleteRecurringItemById = async (req, res, next) => {
  try {
    if (!validators.isValidUUID(req.params.id)) return notFound(res);

    const deleted = await deleteRecurringItem(req.params.id, req.user.user_id);
    if (!deleted) return notFound(res);

    res.status(204).end();
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export {
  getRecurringItems,
  createRecurringItem,
  updateRecurringItemById,
  deleteRecurringItemById,
};
