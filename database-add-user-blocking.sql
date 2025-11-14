-- Add is_blocked column to profiles table for user blocking functionality
-- Run this in your Supabase SQL Editor

-- Add is_blocked column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Create index for better performance when filtering blocked users
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);

-- Add comment to the column
COMMENT ON COLUMN profiles.is_blocked IS 'Whether the user account is blocked by an admin';
