-- Add screen_status tracking columns to group_films
ALTER TABLE group_films
  ADD COLUMN IF NOT EXISTS screen_status TEXT
    CHECK (screen_status IN ('in_theaters', 'coming_soon', 'salon', 'unknown'))
    NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS theatrical_release_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transitioned_to_salon_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS salon_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Add film_moved_to_salon notification type to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'film_moved_to_salon';

-- Nightly refresh function: recomputes screen_status for all visible films
-- that have not been manually overridden (salon_override = false)
CREATE OR REPLACE FUNCTION refresh_screen_status()
RETURNS void AS $$
  UPDATE group_films
  SET
    screen_status = CASE
      WHEN theatrical_release_date IS NULL THEN 'unknown'
      WHEN theatrical_release_date > NOW() THEN 'coming_soon'
      WHEN NOW() - theatrical_release_date <= INTERVAL '35 days' THEN 'in_theaters'
      ELSE 'salon'
    END,
    transitioned_to_salon_at = CASE
      WHEN screen_status != 'salon'
        AND (
          salon_override = true
          OR (theatrical_release_date IS NOT NULL AND NOW() - theatrical_release_date > INTERVAL '35 days')
        )
      THEN NOW()
      ELSE transitioned_to_salon_at
    END
  WHERE visible = true AND salon_override = false;
$$ LANGUAGE sql;
