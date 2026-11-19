-- Refresh token-urile se salveaza doar ca hash SHA-256 (hex, 64 de caractere),
-- nu in clar (inconcordante.md 6.1, security.md). BE calculeaza acelasi hash
-- (services/auth.services.js, hashToken) si cauta dupa el.
-- Token-urile existente sunt transformate pe loc, deci sesiunile raman valide.
-- Se aplica odata cu deploy-ul BE: intre migratie si deploy, /auth/refresh nu
-- gaseste token-ul si userul trebuie sa se logheze din nou.
-- Verificat inainte: sha256(convert_to(token, 'UTF8')) da acelasi hex ca
-- createHash("sha256") din Node; token-urile vechi au 248-259 de caractere,
-- deci niciunul nu e deja un hash.

BEGIN;

UPDATE refresh_tokens
SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex')
WHERE char_length(token) <> 64;

COMMIT;
