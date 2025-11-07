-- Complete Database Update for Prayer & Events App
-- Run this in your Supabase SQL Editor to fix all issues
-- This script is safe to run multiple times (idempotent)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- 1. FIX PROFILES TABLE
-- ======================================

-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update role constraint to include 'pastor'
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('member', 'pastor', 'admin'));

-- Copy full_name to display_name if needed (only if full_name column exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    UPDATE profiles 
    SET display_name = full_name 
    WHERE display_name IS NULL AND full_name IS NOT NULL;
  END IF;
END $$;

-- ======================================
-- 2. FIX EVENTS TABLE
-- ======================================

-- Add missing columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'sabbath',
ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registered_users TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS group_id UUID,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Convert existing date/time columns to timestamp if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_date') THEN
    UPDATE events 
    SET 
      start_at = COALESCE(start_at, (start_date::text || ' ' || COALESCE(start_time::text, '00:00:00'))::timestamp with time zone),
      end_at = COALESCE(end_at, (COALESCE(end_date::text, start_date::text) || ' ' || COALESCE(end_time::text, '23:59:59'))::timestamp with time zone)
    WHERE start_at IS NULL;
  END IF;
END $$;

-- Add event_type constraint
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE events 
ADD CONSTRAINT events_event_type_check 
CHECK (event_type IN ('sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_registration ON events(is_registration_open) WHERE is_registration_open = true;
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

-- ======================================
-- 3. FIX PRAYERS TABLE
-- ======================================

-- Ensure created_by column exists first
ALTER TABLE prayers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Drop policies that depend on requester_id BEFORE dropping the column
DROP POLICY IF EXISTS prayers_read_by_visibility ON prayers;
DROP POLICY IF EXISTS prayers_insert_self_or_admin ON prayers;
DROP POLICY IF EXISTS prayers_update_self_or_admin ON prayers;
DROP POLICY IF EXISTS prayers_delete_self_or_admin ON prayers;

-- Rename requester_id to created_by if needed (and requester_id exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prayers' AND column_name = 'requester_id') THEN
    -- Copy data from requester_id to created_by if created_by is empty
    UPDATE prayers 
    SET created_by = requester_id 
    WHERE created_by IS NULL AND requester_id IS NOT NULL;
    
    -- Drop the old column (now that policies are gone)
    ALTER TABLE prayers DROP COLUMN requester_id;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE prayers 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS group_id UUID,
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP WITH TIME ZONE;

-- Add visibility constraint
ALTER TABLE prayers 
DROP CONSTRAINT IF EXISTS prayers_visibility_check;

ALTER TABLE prayers 
ADD CONSTRAINT prayers_visibility_check 
CHECK (visibility IN ('public', 'group', 'private'));

-- Recreate RLS policies using created_by instead of requester_id
CREATE POLICY prayers_read_by_visibility ON prayers
  FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'private' AND created_by = auth.uid())
    OR (visibility = 'group' AND group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    ))
  );

CREATE POLICY prayers_insert_self_or_admin ON prayers
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'pastor')
    )
  );

CREATE POLICY prayers_update_self_or_admin ON prayers
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'pastor')
    )
  );

CREATE POLICY prayers_delete_self_or_admin ON prayers
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'pastor')
    )
  );

-- ======================================
-- 4. CREATE GROUPS TABLE
-- ======================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update own groups" ON groups;

-- Add RLS policies for groups
CREATE POLICY "Groups are viewable by everyone" 
  ON groups FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create groups" 
  ON groups FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own groups" 
  ON groups FOR UPDATE 
  USING (auth.uid() = created_by);

-- ======================================
-- 5. CREATE NOTIFICATIONS TABLE
-- ======================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Notifications are viewable by everyone" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;

-- Add RLS policies for notifications
CREATE POLICY "Notifications are viewable by everyone" 
  ON notifications FOR SELECT 
  USING (true);

CREATE POLICY "Admins can create notifications" 
  ON notifications FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pastor')
    )
  );

CREATE POLICY "Admins can delete notifications" 
  ON notifications FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pastor')
    )
  );

-- ======================================
-- 6. CREATE USER_NOTIFICATIONS TABLE
-- ======================================
-- This tracks which notifications each user has dismissed/deleted

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS on user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notification status" ON user_notifications;
DROP POLICY IF EXISTS "Users can manage own notification status" ON user_notifications;

-- Add RLS policies for user_notifications
CREATE POLICY "Users can view own notification status" 
  ON user_notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification status" 
  ON user_notifications FOR ALL 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_deleted ON user_notifications(user_id, is_deleted);

-- ======================================
-- 7. UPDATE TRIGGER FUNCTION
-- ======================================

-- Update the trigger function to use correct column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ),
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ),
      NEW.email
    ),
    'member'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================
-- 8. UPDATE TIMESTAMP TRIGGERS
-- ======================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prayers_updated_at ON prayers;
CREATE TRIGGER update_prayers_updated_at BEFORE UPDATE ON prayers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- 9. GRANT PERMISSIONS
-- ======================================

-- Grant all necessary permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ======================================
-- 10. VERIFY SETUP
-- ======================================

-- Show profiles table structure
SELECT 
  'Profiles table:' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Show events table structure
SELECT 
  'Events table:' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Show prayers table structure
SELECT 
  'Prayers table:' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'prayers'
ORDER BY ordinal_position;

-- Show notifications table structure
SELECT 
  'Notifications table:' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Show user_notifications table structure
SELECT 
  'User_notifications table:' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_notifications'
ORDER BY ordinal_position;

-- Show all tables in public schema
SELECT 
  'All tables:' as info,
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
