-- Tururile ghidate din dashboard, cate unul pe pagina: in lista sunt cele
-- terminate sau sarite. Se adauga cate unul la PATCH /auth/user-info cu
-- completeTour: "<pagina>". Inlocuieste has_completed_tour (doar Overview).

BEGIN;

ALTER TABLE users
  ADD COLUMN completed_tours text[] NOT NULL DEFAULT '{}';

UPDATE users SET completed_tours = '{overview}' WHERE has_completed_tour;

ALTER TABLE users DROP COLUMN has_completed_tour;

COMMIT;
