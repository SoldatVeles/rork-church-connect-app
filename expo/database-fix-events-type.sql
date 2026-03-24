-- Fix events table: handle the "type" column issue
-- Run this in your Supabase SQL Editor

-- Step 1: Check what columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Step 2: If "type" column exists with NOT NULL, make it nullable and set a default
-- This prevents errors when inserting without a "type" value
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'type'
  ) THEN
    ALTER TABLE events ALTER COLUMN type DROP NOT NULL;
    ALTER TABLE events ALTER COLUMN type SET DEFAULT 'sabbath';
    
    -- Sync: copy event_type into type where type is null
    UPDATE events SET type = event_type WHERE type IS NULL AND event_type IS NOT NULL;
    
    RAISE NOTICE 'Fixed: "type" column is now nullable with default "sabbath"';
  ELSE
    RAISE NOTICE 'No "type" column found — no fix needed';
  END IF;
END $$;

-- Step 3: Make sure event_type also has a default
ALTER TABLE events ALTER COLUMN event_type SET DEFAULT 'sabbath';

-- Step 4: Verify RLS policies allow authenticated users to insert
-- Drop and recreate the insert policy to be sure
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;

CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()::text
  );

-- Step 5: Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;
