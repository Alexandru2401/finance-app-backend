// Limite de numar per user (security.md 1.8): un cont nu poate umple singur
const MAX_TRANSACTIONS_PER_USER = 20000;
const MAX_CATEGORIES_PER_USER = 100;
const MAX_RECURRING_PER_USER = 50;

// 422, nu 409: FE foloseste 409 pentru "exista deja" (categorie cu acelasi nume,
// categorie care are deja o regula recurenta)
const limitReached = (res, message) =>
  res.status(422).json({ success: false, code: "LIMIT_REACHED", message });

export {
  MAX_TRANSACTIONS_PER_USER,
  MAX_CATEGORIES_PER_USER,
  MAX_RECURRING_PER_USER,
  limitReached,
};
