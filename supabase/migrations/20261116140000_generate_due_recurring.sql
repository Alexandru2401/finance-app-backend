-- Rulată zilnic de pg_cron: adaugă tranzacțiile recurente scadente, creează
-- notificarea pentru fiecare și mută next_run în luna următoare.
-- Dacă jobul a lipsit mai multe luni, recuperează câte o lună pe zi.
CREATE OR REPLACE FUNCTION generate_due_recurring()
RETURNS void
LANGUAGE sql
AS $$
  WITH due AS (
    SELECT r.*, c.name AS category
    FROM recurring_items r
    JOIN categories c USING (category_id)
    WHERE r.is_active
      AND r.next_run <= (now() AT TIME ZONE 'Europe/Bucharest')::date
  ),
  added AS (
    INSERT INTO budget_items (user_id, type, category_id, amount, date, notes, recurring_id)
    SELECT user_id, type, category_id, amount, next_run, notes, id FROM due
    ON CONFLICT (recurring_id, date) WHERE recurring_id IS NOT NULL DO NOTHING
    RETURNING item_id, recurring_id, date
  ),
  notified AS (
    INSERT INTO notifications (user_id, type, data)
    SELECT d.user_id, 'recurring_added',
           jsonb_build_object('item_id', a.item_id, 'amount', d.amount,
                              'category', d.category, 'date', a.date)
    FROM added a
    JOIN due d ON d.id = a.recurring_id
  )
  -- luna următoare, în ziua aleasă (29-31 = ultima zi în lunile mai scurte)
  UPDATE recurring_items r
  SET next_run = (date_trunc('month', d.next_run::timestamp) + interval '1 month')::date
                 + LEAST(COALESCE(d.day_of_month, 1),
                         EXTRACT(DAY FROM date_trunc('month', d.next_run::timestamp)
                                          + interval '2 months - 1 day')::int) - 1,
      updated_at = now()
  FROM due d
  WHERE r.id = d.id;
$$;

-- să nu poată fi apelată din browser prin API-ul Supabase
REVOKE EXECUTE ON FUNCTION generate_due_recurring() FROM PUBLIC, anon, authenticated;
