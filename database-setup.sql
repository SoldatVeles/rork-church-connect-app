-- SQL to add missing columns to events table for full functionality
-- Run this in your Supabase SQL editor

-- Add missing columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'sabbath' CHECK (event_type IN ('sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference')),
ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registered_users JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for better performance on event_type queries
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Create index for better performance on registration queries
CREATE INDEX IF NOT EXISTS idx_events_registration ON events(is_registration_open) WHERE is_registration_open = true;

-- Update existing events to have default event_type if they don't have one
UPDATE events 
SET event_type = 'sabbath' 
WHERE event_type IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;