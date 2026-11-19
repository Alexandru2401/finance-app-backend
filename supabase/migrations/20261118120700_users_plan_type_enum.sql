-- plan_type devine enum NOT NULL (inconcordante.md 5.8). Valorile sunt cele pe
-- care le stie FE (ProfilePage / SidebarUserMenu: free, pro, business); un plan
-- nou se adauga cu ALTER TYPE plan_type ADD VALUE.
-- Verificat inainte: toti userii au plan_type = 'free'.

BEGIN;

CREATE TYPE plan_type AS ENUM ('free', 'pro', 'business');

ALTER TABLE users
  ALTER COLUMN plan_type DROP DEFAULT,
  ALTER COLUMN plan_type TYPE plan_type USING plan_type::plan_type,
  ALTER COLUMN plan_type SET DEFAULT 'free',
  ALTER COLUMN plan_type SET NOT NULL;

COMMIT;
