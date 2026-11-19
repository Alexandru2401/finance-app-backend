-- Numele unei categorii e unic per user si tip fara diferenta intre litere mari
-- si mici, ca in BE: "Sala" si "sala" nu pot exista amandoua (inconcordante.md
-- 5.6). Indexul inlocuieste UNIQUE (user_id, type, name), sensibil la majuscule.
-- Doua cereri simultane: a doua primeste 23505, pe care BE il intoarce ca 409.
-- Verificat inainte: nicio categorie duplicata dupa lower(name).

BEGIN;

CREATE UNIQUE INDEX categories_user_type_lower_name_key
  ON categories (user_id, type, lower(name));

ALTER TABLE categories
  DROP CONSTRAINT categories_user_id_type_name_key;

COMMIT;
