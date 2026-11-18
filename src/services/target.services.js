import pool from "../db/db.js";

// month vine ca 'YYYY-MM-01' sau null -> luna curenta (calculata in SQL, ca la budget)
const MONTH_EXPR = `date_trunc('month', COALESCE($2::date, CURRENT_DATE))::date`;

// target-ul userului pentru o luna
// daca luna nu are target propriu, se mosteneste ultimul target dinainte (carry-over),
// fara sa fie salvat in db; inherited_from = luna din care vine (null daca e al lunii)
// intoarce mereu un rand (cu luna ceruta), campurile sunt null daca nu exista niciun target
const fetchTarget = async (userId, month) => {
  const response = await pool.query(
    `SELECT CASE WHEN t.month = m.month THEN t.id END AS id,
            to_char(m.month, 'YYYY-MM-DD') AS month,
            CASE WHEN t.month < m.month
                 THEN to_char(t.month, 'YYYY-MM-DD') END AS inherited_from,
            t.income, t.expense, t.savings, t.created_at, t.updated_at
     FROM (SELECT ${MONTH_EXPR} AS month) m
     LEFT JOIN LATERAL (
       SELECT * FROM budget_targets
       WHERE user_id = $1 AND month <= m.month
       ORDER BY month DESC
       LIMIT 1
     ) t ON TRUE`,
    [userId, month ?? null],
  );
  return response.rows[0];
};

// toate target-urile salvate ale userului (fara cele mostenite), cele mai noi primele
const fetchAllTargets = async (userId) => {
  const response = await pool.query(
    `SELECT id, to_char(month, 'YYYY-MM-DD') AS month,
            income, expense, savings, created_at, updated_at
     FROM budget_targets
     WHERE user_id = $1
     ORDER BY month DESC`,
    [userId],
  );
  return response.rows;
};

// insert sau update (unique pe user_id + month)
// values: doar campurile trimise; un camp cu null sterge target-ul (fara target)
// la update: campurile netrimise pastreaza valoarea existenta
// la insert (luna noua): campurile netrimise se copiaza din ultimul target dinainte
const upsertTarget = async (userId, month, values) => {
  const response = await pool.query(
    `INSERT INTO budget_targets (user_id, month, income, expense, savings)
     SELECT $1, m.month,
            CASE WHEN $6 THEN $3::numeric ELSE prev.income END,
            CASE WHEN $7 THEN $4::numeric ELSE prev.expense END,
            CASE WHEN $8 THEN $5::numeric ELSE prev.savings END
     FROM (SELECT ${MONTH_EXPR} AS month) m
     LEFT JOIN LATERAL (
       SELECT income, expense, savings FROM budget_targets
       WHERE user_id = $1 AND month < m.month
       ORDER BY month DESC
       LIMIT 1
     ) prev ON TRUE
     ON CONFLICT (user_id, month) DO UPDATE SET
       income     = CASE WHEN $6 THEN $3::numeric ELSE budget_targets.income END,
       expense    = CASE WHEN $7 THEN $4::numeric ELSE budget_targets.expense END,
       savings    = CASE WHEN $8 THEN $5::numeric ELSE budget_targets.savings END,
       updated_at = now()
     RETURNING id, to_char(month, 'YYYY-MM-DD') AS month,
               NULL AS inherited_from,
               income, expense, savings, created_at, updated_at,
               (xmax = 0) AS inserted`,
    [
      userId,
      month ?? null,
      values.income ?? null,
      values.expense ?? null,
      values.savings ?? null,
      "income" in values,
      "expense" in values,
      "savings" in values,
    ],
  );
  return response.rows[0];
};

// target-urile salvate + sumele reale ale fiecarei luni (pentru exportul CSV)
// sumele sunt calculate ca la /budget/summary: tranzactiile din luna respectiva
const fetchTargetHistory = async (userId) => {
  const response = await pool.query(
    `SELECT to_char(t.month, 'YYYY-MM') AS month,
            t.income, t.expense, t.savings,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'income'), 0)  AS actual_income,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'expenses'), 0) AS actual_expense,
            COALESCE(SUM(b.amount) FILTER (WHERE b.type = 'savings'), 0) AS actual_savings
     FROM budget_targets t
     LEFT JOIN budget_items b
       ON b.user_id = t.user_id
      AND b.date >= t.month
      AND b.date < t.month + INTERVAL '1 month'
     WHERE t.user_id = $1
     GROUP BY t.id
     ORDER BY t.month DESC`,
    [userId],
  );
  return response.rows;
};

export { fetchTarget, fetchAllTargets, upsertTarget, fetchTargetHistory };
