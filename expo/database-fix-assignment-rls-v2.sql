-- Fix RLS policies on sabbath_assignments to allow admins/pastors to assign ANY user
-- Also adds a SELECT policy so all authenticated users can read assignments

-- DROP existing policies
DROP POLICY IF EXISTS assignments_select ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_insert ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_update ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_delete ON sabbath_assignments;

-- SELECT: any authenticated user can read assignments
CREATE POLICY assignments_select ON sabbath_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: admins/pastors by profile role, OR group pastors
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
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

-- UPDATE: admins/pastors by profile role, group pastors, OR the assigned user (so they can decline)
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
