-- =====================================================
-- FIX: Add missing RLS policies for EVENTS table
-- Run this in your Supabase SQL Editor
-- This fixes the issue where event creation silently fails
-- =====================================================

-- Ensure RLS is enabled on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Event creators and admins can update events" ON events;
DROP POLICY IF EXISTS "Event creators and admins can delete events" ON events;

-- 1. Anyone can view events
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

-- 2. Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- 3. Event creators and admins can update events
CREATE POLICY "Event creators and admins can update events" ON events
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pastor')
    )
  );

-- 4. Event creators and admins can delete events
CREATE POLICY "Event creators and admins can delete events" ON events
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pastor')
    )
  );
