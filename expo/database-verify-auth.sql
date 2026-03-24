-- Verify and Fix Authentication & Sign Out Issues
-- Run this in your Supabase SQL Editor

-- ======================================
-- 1. ENABLE RLS ON PROFILES TABLE
-- ======================================
-- This is critical - without RLS policies, auth may fail
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ======================================
-- 2. DROP EXISTING PROFILE POLICIES
-- ======================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- ======================================
-- 3. CREATE COMPREHENSIVE PROFILE RLS POLICIES
-- ======================================

-- Allow everyone to view all profiles (needed for user lists, etc.)
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- ======================================
-- 4. VERIFY AUTH.USERS ACCESS
-- ======================================
-- Ensure the trigger function has proper access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    'member',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================
-- 5. VERIFY PROFILES TABLE STRUCTURE
-- ======================================
-- Ensure all required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Update role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('member', 'pastor', 'admin'));

-- ======================================
-- 6. CHECK CURRENT AUTH STATE
-- ======================================
-- Run these queries to verify the setup

-- Check if RLS is enabled on profiles
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if there are any users in profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if there are any users in auth.users
SELECT COUNT(*) as auth_user_count FROM auth.users;

-- ======================================
-- 7. TEST SIGN OUT FUNCTIONALITY
-- ======================================
-- These queries help debug sign-out issues

-- Check active sessions
SELECT 
  id,
  user_id,
  created_at,
  updated_at,
  NOT_AFTER as expires_at
FROM auth.sessions
WHERE NOT_AFTER > NOW()
ORDER BY updated_at DESC;

-- To manually clear all sessions for a specific user (replace 'USER_ID' with actual user ID):
-- DELETE FROM auth.sessions WHERE user_id = 'USER_ID';

-- To manually clear all refresh tokens for a specific user:
-- DELETE FROM auth.refresh_tokens WHERE user_id = 'USER_ID';
