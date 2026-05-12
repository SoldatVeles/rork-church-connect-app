-- =====================================================================
-- FIX: Sabbath delete left orphan rows + cannot recreate Sabbath
-- =====================================================================
-- Run these queries in the Supabase SQL Editor, in order.
-- Each section is independent; you can run section by section.
--
-- Background:
--   The old delete path used the user-authenticated Supabase client,
--   which is subject to RLS. The sabbaths_delete / assignments_delete /
--   attendance_delete policies only allow:
--       - app admins  (is_app_admin())
--       - church pastors of the hosting church (is_church_pastor(group_id))
--   A "church_leader" (without a row in group_pastors) was allowed to
--   manage the Sabbath in application code, but RLS silently dropped
--   the DELETE, so 0 rows were removed and the API still returned success.
--   The leftover row then blocks recreation because of:
--       uq_sabbaths_group_date UNIQUE (group_id, sabbath_date)
--
--   The backend has been patched to use the service-role client for
--   the actual delete after permission is checked. The SQL below also
--   widens the RLS policies so church_leaders for the hosting church
--   can delete directly, and provides a one-time cleanup query.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) INSPECT: what is still in the DB for that group/date combination?
--    Replace the values below to find your stuck row.
-- ---------------------------------------------------------------------
-- SELECT id, group_id, sabbath_date, status, created_by, created_at
-- FROM sabbaths
-- WHERE group_id = '<YOUR_GROUP_ID>'
--   AND sabbath_date = '<YYYY-MM-DD>';

-- ---------------------------------------------------------------------
-- 2) DELETE a single stuck Sabbath + all its dependents.
--    Replace <SABBATH_ID> with the id you found in step 1.
-- ---------------------------------------------------------------------
-- BEGIN;
--   DELETE FROM notifications        WHERE link_path = '/sabbath-detail?id=<SABBATH_ID>';
--   DELETE FROM sabbath_attendance   WHERE sabbath_id = '<SABBATH_ID>';
--   DELETE FROM sabbath_assignments  WHERE sabbath_id = '<SABBATH_ID>';
--   DELETE FROM sabbaths             WHERE id = '<SABBATH_ID>';
-- COMMIT;

-- ---------------------------------------------------------------------
-- 3) FIND any orphaned assignment / attendance rows whose parent
--    Sabbath no longer exists (sanity check).
-- ---------------------------------------------------------------------
-- Assignments without a parent Sabbath:
-- SELECT sa.*
-- FROM sabbath_assignments sa
-- LEFT JOIN sabbaths s ON s.id = sa.sabbath_id
-- WHERE s.id IS NULL;
--
-- Attendance without a parent Sabbath:
-- SELECT sat.*
-- FROM sabbath_attendance sat
-- LEFT JOIN sabbaths s ON s.id = sat.sabbath_id
-- WHERE s.id IS NULL;
--
-- The FK uses ON DELETE CASCADE, so these should be empty. If they are
-- not, clean them up:
-- DELETE FROM sabbath_assignments WHERE sabbath_id NOT IN (SELECT id FROM sabbaths);
-- DELETE FROM sabbath_attendance  WHERE sabbath_id NOT IN (SELECT id FROM sabbaths);


-- ---------------------------------------------------------------------
-- 4) HARDEN RLS so church_leaders for the hosting church can delete
--    Sabbaths directly (matches the in-app "Delete" button permission).
--    Safe to re-run.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS sabbaths_delete ON sabbaths;
CREATE POLICY sabbaths_delete ON sabbaths
  FOR DELETE USING (
    is_app_admin()
    OR is_church_pastor(group_id)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'church_leader'
        AND p.home_group_id = sabbaths.group_id
    )
  );

DROP POLICY IF EXISTS sabbaths_update ON sabbaths;
CREATE POLICY sabbaths_update ON sabbaths
  FOR UPDATE USING (
    is_app_admin()
    OR is_church_pastor(group_id)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'church_leader'
        AND p.home_group_id = sabbaths.group_id
    )
  );

DROP POLICY IF EXISTS sabbaths_insert ON sabbaths;
CREATE POLICY sabbaths_insert ON sabbaths
  FOR INSERT WITH CHECK (
    is_app_admin()
    OR is_church_pastor(group_id)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'church_leader'
        AND p.home_group_id = sabbaths.group_id
    )
  );

DROP POLICY IF EXISTS assignments_delete ON sabbath_assignments;
CREATE POLICY assignments_delete ON sabbath_assignments
  FOR DELETE USING (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND (
          is_church_pastor(s.group_id)
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'church_leader'
              AND p.home_group_id = s.group_id
          )
        )
    )
  );

DROP POLICY IF EXISTS assignments_insert ON sabbath_assignments;
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND (
          is_church_pastor(s.group_id)
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'church_leader'
              AND p.home_group_id = s.group_id
          )
        )
    )
  );

DROP POLICY IF EXISTS attendance_delete ON sabbath_attendance;
CREATE POLICY attendance_delete ON sabbath_attendance
  FOR DELETE USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id
        AND (
          is_church_pastor(s.group_id)
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'church_leader'
              AND p.home_group_id = s.group_id
          )
        )
    )
  );


-- ---------------------------------------------------------------------
-- 5) (Optional, recommended) Confirm uq_sabbaths_group_date still exists
--    so duplicate Sabbaths for the same church/date cannot be created.
-- ---------------------------------------------------------------------
-- SELECT conname, contype
-- FROM   pg_constraint
-- WHERE  conrelid = 'sabbaths'::regclass
--   AND  conname  = 'uq_sabbaths_group_date';


-- ---------------------------------------------------------------------
-- 6) (Optional) Nuke ALL Sabbath data globally (DANGEROUS).
--    Only use if you really want a clean slate. Uncomment to run.
-- ---------------------------------------------------------------------
-- BEGIN;
--   DELETE FROM notifications
--   WHERE type IN (
--     'sabbath_published','sabbath_updated','sabbath_cancelled',
--     'sabbath_assignment','sabbath_assignment_cancelled',
--     'sabbath_reassigned','sabbath_response'
--   );
--   DELETE FROM sabbath_attendance;
--   DELETE FROM sabbath_assignments;
--   DELETE FROM sabbaths;
-- COMMIT;
