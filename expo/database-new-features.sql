-- =====================================================
-- DATABASE SETUP FOR NEW FEATURES
-- Run this SQL in your Supabase SQL Editor
-- Safe to re-run (uses DROP IF EXISTS before CREATE)
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

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view churches" ON churches;
CREATE POLICY "Anyone can view churches" ON churches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage churches" ON churches;
CREATE POLICY "Admins can manage churches" ON churches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );


-- 2. GROUP MEMBERS TABLE (must come before group_messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view group members" ON group_members;
CREATE POLICY "Anyone can view group members" ON group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage group members" ON group_members;
CREATE POLICY "Admins can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor')
    )
  );


-- 3. GROUP MESSAGES TABLE (Small Group Chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view messages" ON group_messages;
CREATE POLICY "Group members can view messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = group_messages.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group members can send messages" ON group_messages;
CREATE POLICY "Group members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = group_messages.group_id 
      AND group_members.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );


-- 4. PRAYER UPDATES TABLE (Prayer Wall Updates)
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_answered_update BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer_id ON prayer_updates(prayer_id);

ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view prayer updates" ON prayer_updates;
CREATE POLICY "Anyone can view prayer updates" ON prayer_updates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Prayer requesters can add updates" ON prayer_updates;
CREATE POLICY "Prayer requesters can add updates" ON prayer_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM prayers 
      WHERE prayers.id = prayer_updates.prayer_id 
      AND prayers.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can add updates" ON prayer_updates;
CREATE POLICY "Admins can add updates" ON prayer_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor')
    )
    AND created_by = auth.uid()
  );


-- 5. RLS POLICIES FOR GROUPS TABLE (if groups table exists)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view groups" ON groups;
CREATE POLICY "Anyone can view groups" ON groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage groups" ON groups;
CREATE POLICY "Admins can manage groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor')
    )
  );


-- 6. SAMPLE DATA (Optional)
-- =====================================================
INSERT INTO churches (name, address) 
SELECT 'Default Church', 'Main Street, City'
WHERE NOT EXISTS (SELECT 1 FROM churches LIMIT 1);
