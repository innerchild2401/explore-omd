ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve current visibility for already active businesses
UPDATE businesses
SET is_published = TRUE
WHERE status = 'active';

