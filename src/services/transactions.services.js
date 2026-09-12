import pool from "../db/db.js";

const MAX_PER_PAGE = 100;

// intreg pozitiv valid, altfel fallback (evita NaN/negative ajunse in LIMIT/OFFSET)
const toSafeInt = (value, fallback, max = Infinity) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return Math.min(num, max);
};

const fetchTransactions = async (userId, filters = {}) => {
  const {
    search,
    type,            // 'income' | 'expense'
    categoryId,
    year, month, day,
    minAmount, maxAmount,
    sort = 'newest',              // 'newest' | 'oldest' | 'highest' | 'lowest'
  } = filters;

  const page = toSafeInt(filters.page, 1);
  const perPage = toSafeInt(filters.perPage, 10, MAX_PER_PAGE);

  const conditions = ['b.user_id = $1'];
  const values = [userId];
  let i = 2;

  if (search)     { conditions.push(`b.title ILIKE $${i++}`); values.push(`%${search}%`); }
  if (type)       { conditions.push(`b.type = $${i++}`);       values.push(type); }
  if (categoryId) { conditions.push(`b.category_id = $${i++}`); values.push(categoryId); }
  if (year)       { conditions.push(`EXTRACT(YEAR  FROM b.date) = $${i++}`); values.push(year); }
  if (month)      { conditions.push(`EXTRACT(MONTH FROM b.date) = $${i++}`); values.push(month); }
  if (day)        { conditions.push(`EXTRACT(DAY   FROM b.date) = $${i++}`); values.push(day); }
  if (minAmount != null) { conditions.push(`b.amount >= $${i++}`); values.push(minAmount); }
  if (maxAmount != null) { conditions.push(`b.amount <= $${i++}`); values.push(maxAmount); }

  const where = conditions.join(' AND ');

  const orderBy = {
    newest:  'b.date DESC',
    oldest:  'b.date ASC',
    highest: 'b.amount DESC',
    lowest:  'b.amount ASC',
  }[sort] ?? 'b.date DESC';

  const offset = (page - 1) * perPage;

  const listQuery = `
    SELECT b.item_id, b.title, b.type, b.amount, b.date,
           c.name AS category_name
    FROM budget_items b
    LEFT JOIN categories c ON c.category_id = b.category_id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT $${i++} OFFSET $${i++}`;

  const listValues = [...values, perPage, offset];

  // total (număr de rânduri filtrate) + net total, calculate pe TOT setul filtrat, nu doar pagina
  const totalsQuery = `
    SELECT COUNT(*) AS count,
           COALESCE(SUM(CASE WHEN b.type = 'income' THEN b.amount ELSE -b.amount END), 0) AS net
    FROM budget_items b
    WHERE ${where}`;

  const [list, totals] = await Promise.all([
    pool.query(listQuery, listValues),
    pool.query(totalsQuery, values),
  ]);

  return {
    rows: list.rows.map(r => ({ ...r, amount: Number(r.amount) })),
    total: Number(totals.rows[0].count),
    net: Number(totals.rows[0].net),
  };
};

export { fetchTransactions };