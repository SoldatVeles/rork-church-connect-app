-- ============================================================
-- Add country_id to sabbaths for fast country-based queries
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- 1) Add the column (nullable; will be auto-filled by trigger)
ALTER TABLE sabbaths
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES countries(id) ON DELETE SET NULL;

-- 2) Backfill existing rows from the owning group's country
UPDATE sabbaths s
SET country_id = g.country_id
FROM groups g
WHERE s.group_id = g.id
  AND (s.country_id IS DISTINCT FROM g.country_id);

-- 3) Trigger: keep sabbaths.country_id in sync with groups.country_id
--    on INSERT / UPDATE of sabbaths
CREATE OR REPLACE FUNCTION sabbaths_set_country_id_from_group()
RETURNS trigger AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    SELECT g.country_id INTO NEW.country_id
    FROM groups g
    WHERE g.id = NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sabbaths_set_country_id ON sabbaths;
CREATE TRIGGER trg_sabbaths_set_country_id
  BEFORE INSERT OR UPDATE OF group_id ON sabbaths
  FOR EACH ROW
  EXECUTE FUNCTION sabbaths_set_country_id_from_group();

-- 4) Trigger: when a group's country_id changes, propagate to its sabbaths
CREATE OR REPLACE FUNCTION groups_propagate_country_id_to_sabbaths()
RETURNS trigger AS $$
BEGIN
  IF NEW.country_id IS DISTINCT FROM OLD.country_id THEN
    UPDATE sabbaths
    SET country_id = NEW.country_id
    WHERE group_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_groups_propagate_country_id ON groups;
CREATE TRIGGER trg_groups_propagate_country_id
  AFTER UPDATE OF country_id ON groups
  FOR EACH ROW
  EXECUTE FUNCTION groups_propagate_country_id_to_sabbaths();

-- 5) Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_sabbaths_country_id
  ON sabbaths(country_id);

CREATE INDEX IF NOT EXISTS idx_sabbaths_country_date_status
  ON sabbaths(country_id, sabbath_date, status);
