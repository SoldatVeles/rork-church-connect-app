-- Fix RLS policy on sabbath_assignments to allow admins and pastors (by profile role) to insert/update/delete

-- DROP existing policies
DROP POLICY IF EXISTS assignments_insert ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_update ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_delete ON sabbath_assignments;

-- INSERT: pastors of the group OR admin/pastor role in profiles
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_assignments.sabbath_id AND gp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pastor')
    )
  );

-- UPDATE: pastors of the group, assigned user, OR admin/pastor role
CREATE POLICY assignments_update ON sabbath_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND (
          EXISTS (
            SELECT 1 FROM group_pastors gp
            WHERE gp.group_id = s.group_id AND gp.user_id = auth.uid()
          )
          OR sabbath_assignments.user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pastor')
    )
  );

-- DELETE: pastors of the group OR admin/pastor role
CREATE POLICY assignments_delete ON sabbath_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_assignments.sabbath_id AND gp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pastor')
    )
  );
