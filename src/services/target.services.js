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
// la update: campurile trimise ca null/undefined pastreaza valoarea existenta
// la insert (luna noua): campurile netrimise se copiaza din ultimul target dinainte
const upsertTarget = async (userId, month, { income, expense, savings }) => {
  const response = await pool.query(
    `INSERT INTO budget_targets (user_id, month, income, expense, savings)
     SELECT $1, m.month,
            COALESCE($3::numeric, prev.income),
            COALESCE($4::numeric, prev.expense),
            COALESCE($5::numeric, prev.savings)
     FROM (SELECT ${MONTH_EXPR} AS month) m
     LEFT JOIN LATERAL (
       SELECT income, expense, savings FROM budget_targets
       WHERE user_id = $1 AND month < m.month
       ORDER BY month DESC
       LIMIT 1
     ) prev ON TRUE
     ON CONFLICT (user_id, month) DO UPDATE SET
       income     = COALESCE($3::numeric, budget_targets.income),
       expense    = COALESCE($4::numeric, budget_targets.expense),
       savings    = COALESCE($5::numeric, budget_targets.savings),
       updated_at = now()
     RETURNING id, to_char(month, 'YYYY-MM-DD') AS month,
               NULL AS inherited_from,
               income, expense, savings, created_at, updated_at,
               (xmax = 0) AS inserted`,
    [userId, month ?? null, income ?? null, expense ?? null, savings ?? null],
  );
  return response.rows[0];
};

export { fetchTarget, fetchAllTargets, upsertTarget };
