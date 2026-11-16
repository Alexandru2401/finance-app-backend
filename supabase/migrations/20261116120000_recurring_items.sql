-- Tranzacții recurente (notification.md, D1): regula după care o tranzacție
-- se adaugă automat în fiecare lună. Tranzacțiile generate stau în budget_items
-- (vezi 20261116120100_budget_items_recurring_id.sql).

BEGIN;

CREATE TABLE recurring_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  type          budget_type NOT NULL,
  -- Categoria ștearsă: regula rămâne fără categorie și e pusă pe pauză de BE
  category_id   uuid REFERENCES categories (category_id) ON DELETE SET NULL,
  amount        numeric(12, 2) NOT NULL CHECK (amount > 0),
  notes         text CHECK (char_length(notes) <= 1500),
  -- Doar lunar deocamdată; lista se extinde când apar weekly / yearly
  frequency     varchar NOT NULL DEFAULT 'monthly'
                CHECK (frequency IN ('monthly')),
  -- NULL = ziua 1. 29-31 în lunile mai scurte = ultima zi a lunii (calculat în BE)
  day_of_month  smallint CHECK (day_of_month BETWEEN 1 AND 31),
  -- Următoarea dată la care se generează tranzacția
  next_run      date NOT NULL,
  -- false = pe pauză, nu se mai generează nimic
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Jobul zilnic caută doar regulile active și scadente
CREATE INDEX recurring_items_due_idx
  ON recurring_items (next_run) WHERE is_active;

-- Lista din pagina „Recurente” și limita de 50 de reguli per user
CREATE INDEX recurring_items_user_idx ON recurring_items (user_id);

-- La fel ca restul tabelelor (security.md 1.2): fără policy-uri, accesul prin
-- API-ul public Supabase e blocat; backend-ul se conectează direct și nu e afectat
ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;

COMMIT;
