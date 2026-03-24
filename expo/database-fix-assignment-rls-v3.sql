-- DEFINITIVE FIX: Drop ALL policies on sabbath_assignments and recreate clean ones
-- This ensures no leftover policies are blocking inserts

-- Drop every possible policy name that might exist
DROP POLICY IF EXISTS assignments_select ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_insert ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_update ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_delete ON sabbath_assignments;
DROP POLICY IF EXISTS "assignments_select" ON sabbath_assignments;
DROP POLICY IF EXISTS "assignments_insert" ON sabbath_assignments;
DROP POLICY IF EXISTS "assignments_update" ON sabbath_assignments;
DROP POLICY IF EXISTS "assignments_delete" ON sabbath_assignments;
DROP POLICY IF EXISTS "Enable read access for all users" ON sabbath_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sabbath_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON sabbath_assignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON sabbath_assignments;
DROP POLICY IF EXISTS "sabbath_assignments_select" ON sabbath_assignments;
DROP POLICY IF EXISTS "sabbath_assignments_insert" ON sabbath_assignments;
DROP POLICY IF EXISTS "sabbath_assignments_update" ON sabbath_assignments;
DROP POLICY IF EXISTS "sabbath_assignments_delete" ON sabbath_assignments;
DROP POLICY IF EXISTS "Users can view assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Users can insert assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Users can update assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Users can delete assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "Allow insert for admins" ON sabbath_assignments;
DROP POLICY IF EXISTS "Allow update for admins" ON sabbath_assignments;
DROP POLICY IF EXISTS "Allow delete for admins" ON sabbath_assignments;
DROP POLICY IF EXISTS "select_assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "insert_assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "update_assignments" ON sabbath_assignments;
DROP POLICY IF EXISTS "delete_assignments" ON sabbath_assignments;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE sabbath_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sabbath_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read assignments
CREATE POLICY assignments_select ON sabbath_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: admins/pastors by profile role, OR group pastors can assign ANY user
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pastor')
    )
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_id AND gp.user_id = auth.uid()
    )
  );

-- UPDATE: admins/pastors by profile role, group pastors, OR the assigned user themselves
CREATE POLICY assignments_update ON sabbath_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pastor')
    )
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_assignments.sabbath_id AND gp.user_id = auth.uid()
    )
    OR sabbath_assignments.user_id = auth.uid()
  );

-- DELETE: admins/pastors by profile role, OR group pastors
CREATE POLICY assignments_delete ON sabbath_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pastor')
    )
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_assignments.sabbath_id AND gp.user_id = auth.uid()
    )
  );

-- VERIFY: Check your current user's role in profiles
-- Run this separately to confirm your role:
-- SELECT id, role, full_name FROM profiles WHERE id = auth.uid();
