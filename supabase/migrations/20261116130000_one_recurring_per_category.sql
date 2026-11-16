-- Recurența ține de categorie (notification.md): o categorie are cel mult o
-- regulă, iar regula se gestionează din Setări → Categorii, la editarea
-- categoriei. Se rulează după 20261116120000_recurring_items.sql.

BEGIN;

-- Regulile fără categorie nu mai pot fi văzute sau gestionate din UI
-- (categoriile lor au fost șterse); tranzacțiile generate de ele rămân
DELETE FROM recurring_items WHERE category_id IS NULL;

ALTER TABLE recurring_items ALTER COLUMN category_id SET NOT NULL;

-- Ștergerea categoriei șterge și regula ei (înainte: SET NULL)
ALTER TABLE recurring_items
  DROP CONSTRAINT recurring_items_category_id_fkey,
  ADD CONSTRAINT recurring_items_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
    ON DELETE CASCADE;

-- O singură regulă per categorie. Dacă pică aici, o categorie are deja mai
-- multe reguli (din teste): păstrează una și rulează din nou
CREATE UNIQUE INDEX recurring_items_category_key
  ON recurring_items (category_id);

COMMIT;
