-- timestamp -> timestamptz, ca restul coloanelor de timp (inconcordante.md 5.4).
-- Valorile vechi sunt citite ca UTC: baza ruleaza pe UTC, deci now() (default-ul
-- lui users.created_at si refresh_tokens.created_at) a scris ora UTC.
-- refresh_tokens.expires_at vine din BE (Date JS); tokenurile create dintr-un BE
-- pornit pe ora Romaniei pot expira cu pana la 2-3 ore mai tarziu decat trebuia.
-- Dupa migratie pg trimite Date-ul cu fus orar, deci valorile noi sunt corecte.

BEGIN;

ALTER TABLE users
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE refresh_tokens
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

COMMIT;
