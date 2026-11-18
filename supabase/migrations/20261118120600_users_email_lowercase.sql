-- Emailul e salvat mereu cu litere mici (BE il face lowercase la register si
-- login), deci UNIQUE (email) existent devine insensibil la majuscule
-- (inconcordante.md 5.7). Varianta aleasa in locul unui index pe lower(email):
-- users_email_key ramane indexul folosit de login (WHERE email = $1).
-- Verificat inainte: niciun email cu litere mari si niciun duplicat.

BEGIN;

ALTER TABLE users
  ADD CONSTRAINT users_email_lowercase_check CHECK (email = lower(email));

COMMIT;
