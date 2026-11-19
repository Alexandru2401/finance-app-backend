-- Suma unei tranzactii e mereu pozitiva (tipul spune daca e venit, cheltuiala
-- sau economie). BE valideaza deja amount > 0; CHECK-ul il garanteaza si in DB,
-- la fel ca recurring_items_amount_check (inconcordante.md 5.1).
-- Verificat inainte: niciun rand din budget_items cu amount <= 0.

BEGIN;

ALTER TABLE budget_items
  ADD CONSTRAINT budget_items_amount_check CHECK (amount > 0);

COMMIT;
