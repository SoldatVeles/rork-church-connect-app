-- ============================================================
-- FIX: Sabbath creation permissions for church_leader, pastor, admin
-- ============================================================
-- Problem: church_leader users could not insert into sabbaths because
-- the RLS policy only checked is_app_admin() OR is_church_pastor(group_id).
-- church_leader users who are NOT in group_pastors for the target group
-- were denied by RLS even though the backend allowed the operation.
--
-- Fix: Create a unified can_manage_sabbath() helper that grants access to:
--   1. Admin (any group)
--   2. Users listed in group_pastors for the target group (any role)
--   3. church_leader users for their home_group_id
--
-- Then update all sabbaths + sabbath_assignments policies to use it.
-- ============================================================

-- 1. New unified helper function
CREATE OR REPLACE FUNCTION can_manage_sabbath(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT (
    is_app_admin()
    OR is_church_pastor(_group_id)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'church_leader'
        AND home_group_id = _group_id
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 2. Recreate sabbaths policies
-- ============================================================

DROP POLICY IF EXISTS sabbaths_select ON sabbaths;
DROP POLICY IF EXISTS sabbaths_insert ON sabbaths;
DROP POLICY IF EXISTS sabbaths_update ON sabbaths;
DROP POLICY IF EXISTS sabbaths_delete ON sabbaths;

-- SELECT: published = any authenticated user; draft/cancelled = managers + creator
CREATE POLICY sabbaths_select ON sabbaths
  FOR SELECT USING (
    (status = 'published' AND auth.uid() IS NOT NULL)
    OR can_manage_sabbath(group_id)
    OR (status = 'draft' AND created_by = auth.uid())
  );

-- INSERT: admin, group_pastors, or church_leader for their home group
CREATE POLICY sabbaths_insert ON sabbaths
  FOR INSERT WITH CHECK (
    can_manage_sabbath(group_id)
  );

-- UPDATE: same as insert
CREATE POLICY sabbaths_update ON sabbaths
  FOR UPDATE USING (
    can_manage_sabbath(group_id)
  );

-- DELETE: same as insert
CREATE POLICY sabbaths_delete ON sabbaths
  FOR DELETE USING (
    can_manage_sabbath(group_id)
  );

-- ============================================================
-- 3. Recreate sabbath_assignments policies
-- ============================================================

DROP POLICY IF EXISTS assignments_select ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_insert ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_update ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_delete ON sabbath_assignments;

-- SELECT: any authenticated user can read (simplification from v3 fix)
CREATE POLICY assignments_select ON sabbath_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: must be able to manage the parent sabbath's group
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_id
        AND can_manage_sabbath(s.group_id)
    )
  );

-- UPDATE: managers of the group OR the assigned user themselves
CREATE POLICY assignments_update ON sabbath_assignments
  FOR UPDATE USING (
    sabbath_assignments.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND can_manage_sabbath(s.group_id)
    )
  );

-- DELETE: managers of the group only
CREATE POLICY assignments_delete ON sabbath_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND can_manage_sabbath(s.group_id)
    )
  );

-- ============================================================
-- DONE
-- ============================================================
-- Run this in Supabase SQL Editor.
-- After running, verify with:
--   SELECT can_manage_sabbath('<your-group-id>');
-- while authenticated as the church_leader user.
-- ============================================================
