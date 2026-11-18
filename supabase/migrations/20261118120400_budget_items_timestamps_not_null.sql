-- created_at e folosit la sortare (lista de tranzactii, top cheltuieli), deci
-- nu poate lipsi; updated_at la fel (inconcordante.md 5.5). Ambele au deja
-- DEFAULT now().
-- Verificat inainte: niciun rand cu created_at sau updated_at NULL.

BEGIN;

ALTER TABLE budget_items
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

COMMIT;
