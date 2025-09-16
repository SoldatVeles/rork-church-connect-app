-- Fix Database Schema to Match App Requirements
-- Run this in your Supabase SQL Editor

-- 1. Fix profiles table structure
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ALTER COLUMN role TYPE TEXT,
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new role constraint
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('member', 'pastor', 'admin'));

-- Copy full_name to display_name if it exists
UPDATE profiles 
SET display_name = full_name 
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 2. Fix events table structure
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

-- Convert existing date/time columns to timestamp
UPDATE events 
SET 
  start_at = (start_date::text || ' ' || start_time::text)::timestamp with time zone,
  end_at = (end_date::text || ' ' || end_time::text)::timestamp with time zone
WHERE start_at IS NULL;

-- Add event_type constraint
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_event_type_check,
ADD CONSTRAINT events_event_type_check 
CHECK (event_type IN ('sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference'));

-- 3. Fix prayers table structure
ALTER TABLE prayers 
ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS details TEXT,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS group_id UUID,
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP WITH TIME ZONE;

-- Copy description to details
UPDATE prayers 
SET details = description 
WHERE details IS NULL;

-- Add visibility constraint
ALTER TABLE prayers 
DROP CONSTRAINT IF EXISTS prayers_visibility_check,
ADD CONSTRAINT prayers_visibility_check 
CHECK (visibility IN ('public', 'group', 'private'));

-- 4. Create groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on new tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 7. Add RLS policies for groups
CREATE POLICY "Groups are viewable by everyone" 
  ON groups FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create groups" 
  ON groups FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Add RLS policies for notifications
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

-- 9. Update the trigger function to use correct column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
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
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 12. Verify the changes
SELECT 
  'Profiles table columns:' as info,
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;