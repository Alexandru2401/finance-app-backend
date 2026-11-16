-- Legătura dintre o tranzacție și regula care a generat-o (notification.md, D2).
-- Depinde de 20261116120000_recurring_items.sql.

BEGIN;

-- NULL = tranzacție adăugată manual. Regula ștearsă: tranzacțiile generate rămân
ALTER TABLE budget_items
  ADD COLUMN recurring_id uuid REFERENCES recurring_items (id) ON DELETE SET NULL;

-- Aceeași regulă nu poate genera de două ori aceeași zi, chiar dacă jobul zilnic
-- și catch-up-ul din BE rulează în același timp (INSERT ... ON CONFLICT DO NOTHING)
CREATE UNIQUE INDEX budget_items_recurring_date_key
  ON budget_items (recurring_id, date) WHERE recurring_id IS NOT NULL;

COMMIT;
