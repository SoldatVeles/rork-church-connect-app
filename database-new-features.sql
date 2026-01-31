-- =====================================================
-- DATABASE SETUP FOR NEW FEATURES
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. CHURCHES TABLE (Multi-Church Support)
-- =====================================================
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add church_id to existing tables (optional - for data isolation)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
-- ALTER TABLE prayers ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);

-- RLS for churches
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view churches" ON churches
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage churches" ON churches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );


-- 2. GROUP MESSAGES TABLE (Small Group Chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);

-- RLS for group messages
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = group_messages.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = group_messages.group_id 
      AND group_members.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );


-- 3. PRAYER UPDATES TABLE (Prayer Wall Updates)
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_answered_update BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster update retrieval
CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer_id ON prayer_updates(prayer_id);

-- RLS for prayer updates
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prayer updates" ON prayer_updates
  FOR SELECT USING (true);

CREATE POLICY "Prayer requesters can add updates" ON prayer_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM prayers 
      WHERE prayers.id = prayer_updates.prayer_id 
      AND prayers.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Admins and pastors can also add updates
CREATE POLICY "Admins can add updates" ON prayer_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor')
    )
    AND created_by = auth.uid()
  );


-- 4. GROUP MEMBERS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- RLS for group members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor')
    )
  );


-- 5. SAMPLE DATA (Optional)
-- =====================================================
-- Insert a default church if none exists
INSERT INTO churches (name, address) 
SELECT 'Default Church', 'Main Street, City'
WHERE NOT EXISTS (SELECT 1 FROM churches LIMIT 1);
