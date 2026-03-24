-- =====================================================
-- FIX: Event creation failing due to "type" column
-- =====================================================
-- The app sends "event_type" but the DB may also have a
-- "type" column with NOT NULL. This script fixes that.
-- Run this in your Supabase SQL Editor.
-- =====================================================

-- Step 1: If "type" column exists, make it nullable with a default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'type'
  ) THEN
    ALTER TABLE events ALTER COLUMN type DROP NOT NULL;
    ALTER TABLE events ALTER COLUMN type SET DEFAULT 'sabbath';
    RAISE NOTICE 'Fixed: "type" column is now nullable with default "sabbath"';
  ELSE
    RAISE NOTICE 'No "type" column found — no fix needed for that column';
  END IF;
END $$;

-- Step 2: Ensure event_type column exists and has a default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE events ALTER COLUMN event_type SET DEFAULT 'sabbath';
    RAISE NOTICE 'event_type default set to "sabbath"';
  ELSE
    ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'sabbath';
    RAISE NOTICE 'Added event_type column with default "sabbath"';
  END IF;
END $$;

-- Step 3: Sync type from event_type where type is null
UPDATE events SET type = event_type WHERE type IS NULL AND event_type IS NOT NULL;

-- Step 4: Fix RLS — ensure created_by comparison works (UUID vs text)
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;

CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by::text = auth.uid()::text
  );

-- Step 5: Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;
