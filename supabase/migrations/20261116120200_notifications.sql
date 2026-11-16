-- Notificările din aplicație (notification.md, D3): clopoțelul și pagina de notificări.
-- Se salvează valorile (data), nu textul, ca FE-ul să le traducă (ro/en)
-- și să formateze suma în moneda userului.

BEGIN;

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  -- recurring_added    = s-a generat o tranzacție
  -- recurring_paused   = categoria regulii a fost ștearsă
  -- recurring_upcoming = urmează o tranzacție peste 3 zile (opțional, N7)
  type        varchar NOT NULL
              CHECK (type IN ('recurring_added', 'recurring_paused', 'recurring_upcoming')),
  -- ex. { "recurring_id", "item_id", "type", "amount", "category", "date" }
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- NULL = necitită
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Lista paginată, cele mai noi primele
CREATE INDEX notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

-- Numărul de pe clopoțel
CREATE INDEX notifications_unread_idx
  ON notifications (user_id) WHERE read_at IS NULL;

-- La fel ca restul tabelelor (security.md 1.2)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

COMMIT;
