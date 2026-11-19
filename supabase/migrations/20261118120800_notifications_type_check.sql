-- Doar recurring_added e creat (de generate_due_recurring); recurring_paused si
-- recurring_upcoming nu le creeaza nimic, iar FE nu le mai afiseaza
-- (inconcordante.md 5.9). Un tip nou se adauga aici odata cu codul care il creeaza.
-- Verificat inainte: in notifications exista doar recurring_added.

BEGIN;

ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check,
  ADD CONSTRAINT notifications_type_check CHECK (type IN ('recurring_added'));

COMMIT;
