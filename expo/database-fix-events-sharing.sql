-- =============================================================
-- Fix cross-church event visibility
-- =============================================================
-- Problem: a Pastor in church A creates an event with
-- is_shared_all_churches = false, but a Church-Leader in church B
-- can still see it. Root causes addressed here:
--   1) Ensure the events table actually has group_id +
--      is_shared_all_churches columns (with safe defaults).
--   2) Backfill any NULL is_shared_all_churches to false.
--   3) Replace the permissive "Anyone can view events" RLS policy
--      with one that enforces per-church visibility plus the
--      "share with all churches" flag.
--
-- Safe to run multiple times.
-- =============================================================

-- 1. Ensure columns exist
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_shared_all_churches BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill any NULLs (in case the column existed without NOT NULL)
UPDATE events
SET is_shared_all_churches = false
WHERE is_shared_all_churches IS NULL;

-- 3. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_is_shared_all_churches ON events(is_shared_all_churches);

-- 4. RLS: enforce visibility on the server too
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop any older permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "View events scoped to church or shared" ON events;

-- Authenticated users only, scoped to their church or globally shared
CREATE POLICY "View events scoped to church or shared" ON events
  FOR SELECT
  USING (
    -- Globally shared events visible to everyone
    is_shared_all_churches = true
    -- The creator always sees their own event
    OR created_by = auth.uid()
    -- Admins see everything
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    -- Members of the event's group see it (home group)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.home_group_id IS NOT NULL
        AND p.home_group_id = events.group_id
    )
    -- Or explicit group_members rows
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = events.group_id
    )
  );

-- Optional sanity check
SELECT
  COUNT(*) FILTER (WHERE is_shared_all_churches IS NULL) AS null_shared_flag,
  COUNT(*) FILTER (WHERE group_id IS NULL)               AS missing_group_id,
  COUNT(*)                                               AS total_events
FROM events;
