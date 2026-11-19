-- Notitele unei tranzactii au maxim 1500 de caractere, ca in BE, in FE si ca
-- recurring_items_notes_check (inconcordante.md 5.2).
-- Verificat inainte: nicio nota din budget_items peste 1500 de caractere.

BEGIN;

ALTER TABLE budget_items
  ADD CONSTRAINT budget_items_notes_check
  CHECK (notes IS NULL OR char_length(notes) <= 1500);

COMMIT;
