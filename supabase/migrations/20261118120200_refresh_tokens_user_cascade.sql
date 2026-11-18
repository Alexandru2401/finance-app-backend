-- Un refresh token apartine mereu unui user si dispare odata cu el
-- (inconcordante.md 5.3). Delete Account le sterge deja explicit; FK-ul cu
-- ON DELETE CASCADE il garanteaza si in DB, ca la celelalte tabele.
-- Verificat inainte: niciun token cu user_id NULL si niciun token orfan.

BEGIN;

ALTER TABLE refresh_tokens
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE refresh_tokens
  DROP CONSTRAINT refresh_tokens_user_id_fkey,
  ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE;

COMMIT;
