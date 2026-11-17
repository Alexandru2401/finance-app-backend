-- Turul ghidat al paginii Overview: pornit automat pana cand userul il termina
-- sau il sare. Devine true o singura data, la PATCH /auth/user-info cu completeTour: true.

BEGIN;

ALTER TABLE users
  ADD COLUMN has_completed_tour boolean NOT NULL DEFAULT false;

COMMIT;
