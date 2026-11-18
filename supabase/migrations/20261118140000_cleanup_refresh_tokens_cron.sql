-- Sterge zilnic refresh token-urile expirate (inconcordante.md 6.2).
-- Un rand se adauga la fiecare login / register si dispare doar la logout,
-- schimbarea parolei sau stergerea contului; restul raman dupa cele 30 de zile.
-- Expirate nu mai pot fi folosite (fetchRefreshToken cere expires_at > NOW()),
-- doar ocupa loc. Ruleaza la 04:00 UTC, dupa cleanup-notifications (03:00).
-- cron.schedule cu acelasi nume actualizeaza jobul, deci migratia poate rula
-- de mai multe ori.

SELECT cron.schedule(
  'cleanup-refresh-tokens',
  '0 4 * * *',
  $$DELETE FROM refresh_tokens WHERE expires_at < now()$$
);
