-- Add is_urgent flag to prayers table
ALTER TABLE prayers ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_prayers_is_urgent ON prayers(is_urgent);
