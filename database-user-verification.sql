-- User Verification SQL Script
-- Run this in your Supabase SQL Editor to check the state of your users

-- 1. Check if profiles table exists and has data
SELECT 
  'Profiles Count' as check_name,
  COUNT(*) as count
FROM profiles;

-- 2. Show all profiles in the database
SELECT 
  'All Profiles' as section,
  id,
  email,
  full_name,
  display_name,
  role,
  is_blocked,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Check auth.users table (requires service role or admin access)
-- This shows users in the authentication system
SELECT 
  'Auth Users Count' as check_name,
  COUNT(*) as count
FROM auth.users;

-- 4. Show all auth users
SELECT 
  'All Auth Users' as section,
  id,
  email,
  raw_user_meta_data,
  created_at,
  email_confirmed_at,
  banned_until
FROM auth.users
ORDER BY created_at DESC;

-- 5. Find users in auth.users but NOT in profiles
SELECT 
  'Users Missing from Profiles' as section,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 6. Find users in profiles but NOT in auth.users
SELECT 
  'Profiles Missing from Auth' as section,
  p.id,
  p.email,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;

-- 7. Check RLS policies on profiles table
SELECT 
  'RLS Policies on Profiles' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 8. Check if RLS is enabled on profiles table
SELECT 
  'RLS Status' as check_name,
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'profiles';
