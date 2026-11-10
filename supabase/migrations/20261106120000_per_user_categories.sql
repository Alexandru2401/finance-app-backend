-- Categoriile devin ale fiecărui user: conturile noi le primesc la înregistrare cele 12 categorii default
-- (src/utils/starterCategories.js). Baza are doar date de test, așa că le ștergem.

BEGIN;

-- Șterge toate datele de test
TRUNCATE users, categories, budget_items, budget_targets, refresh_tokens;

-- Categoriile aparțin mereu unui user
ALTER TABLE categories DROP COLUMN key;
ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;

-- Index duplicat
ALTER TABLE categories DROP CONSTRAINT categories_user_type_name_key;

-- Indexuri pentru viteză
CREATE INDEX budget_items_user_date_idx ON budget_items (user_id, date DESC);
CREATE INDEX budget_items_category_idx ON budget_items (category_id);
CREATE INDEX refresh_tokens_token_idx ON refresh_tokens (token);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

COMMIT;
