-- Rotatia refresh token-ului (security.md): la fiecare /auth/refresh token-ul
-- vechi e marcat cu revoked_at si se emite unul nou. Randul vechi ramane o zi,
-- ca reutilizarea lui (token furat) sa poata fi detectata: BE inchide atunci
-- toate sesiunile userului. In primele 30 de secunde dupa rotatie token-ul
-- vechi e inca acceptat (doua tab-uri care fac refresh in acelasi timp).

BEGIN;

ALTER TABLE refresh_tokens
  ADD COLUMN revoked_at timestamptz;

COMMIT;

-- Jobul de curatenie (20261118140000) sterge acum si token-urile inlocuite
-- mai vechi de o zi; cu acelasi nume, cron.schedule actualizeaza jobul.
SELECT cron.schedule(
  'cleanup-refresh-tokens',
  '0 4 * * *',
  $$DELETE FROM refresh_tokens
    WHERE expires_at < now()
       OR revoked_at < now() - interval '1 day'$$
);
