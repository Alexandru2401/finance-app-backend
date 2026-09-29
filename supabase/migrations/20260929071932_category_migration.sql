-- categoriile default au user_id NULL
ALTER TABLE categories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE categories ALTER COLUMN created_at SET NOT NULL;

-- key stabil pentru traducere (doar la categoriile default)
ALTER TABLE categories ADD COLUMN key varchar;

-- default = are key și nu are user; custom = are user și nu are key
ALTER TABLE categories
  ADD CONSTRAINT categories_default_has_key_check
  CHECK ((user_id IS NULL) = (key IS NOT NULL));

-- fără nume duplicate per user + type (NULL-urile tratate ca egale)
ALTER TABLE categories
  ADD CONSTRAINT categories_user_type_name_key
  UNIQUE NULLS NOT DISTINCT (user_id, type, name);

-- fără key duplicat per type ("other" există la toate 3 tipurile)
ALTER TABLE categories
  ADD CONSTRAINT categories_type_key_key
  UNIQUE (type, key);

INSERT INTO categories (type, key, name) VALUES
  ('income', 'salary', 'Salary'),
  ('income', 'freelance', 'Freelance'),
  ('income', 'investments', 'Investments'),
  ('income', 'bonus', 'Bonus'),
  ('income', 'rental', 'Rental Income'),
  ('income', 'dividends', 'Dividends'),
  ('income', 'other', 'Other'),
  ('expense', 'groceries', 'Groceries'),
  ('expense', 'rent', 'Rent / Mortgage'),
  ('expense', 'utilities', 'Utilities'),
  ('expense', 'transport', 'Transport'),
  ('expense', 'healthcare', 'Healthcare'),
  ('expense', 'entertainment', 'Entertainment'),
  ('expense', 'invoice', 'Invoice'),
  ('expense', 'subscriptions', 'Subscriptions'),
  ('expense', 'dining', 'Dining Out'),
  ('expense', 'other', 'Other'),
  ('savings', 'emergency', 'Emergency Fund'),
  ('savings', 'retirement', 'Retirement'),
  ('savings', 'vacation', 'Vacation'),
  ('savings', 'education', 'Education'),
  ('savings', 'investment', 'Investment Fund'),
  ('savings', 'house', 'House / Property'),
  ('savings', 'other', 'Other')
ON CONFLICT DO NOTHING;