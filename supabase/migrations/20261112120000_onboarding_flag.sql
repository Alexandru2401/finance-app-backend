-- Onboarding obligatoriu: userul ajunge in dashboard doar dupa ce si-a ales numele si moneda.
-- Devine true o singura data, la PATCH /auth/user-info cu completeOnboarding: true.

BEGIN;

ALTER TABLE users
  ADD COLUMN has_completed_onboarding boolean NOT NULL DEFAULT false;

-- Userii existenti care au deja nume au trecut prin onboarding
UPDATE users SET has_completed_onboarding = true WHERE username IS NOT NULL;

COMMIT;
