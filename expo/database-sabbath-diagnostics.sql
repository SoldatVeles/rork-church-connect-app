-- ============================================================
-- SABBATH DIAGNOSTICS
-- Run each block in the Supabase SQL Editor.
-- Replace <USER_ID> and <GROUP_ID> with real UUIDs where needed.
-- ============================================================

-- 1. All sabbaths grouped by status and past/future
SELECT
  id,
  group_id,
  sabbath_date,
  status,
  created_by,
  created_at,
  (sabbath_date >= CURRENT_DATE) AS is_upcoming
FROM sabbaths
ORDER BY sabbath_date DESC;

-- 2. Upcoming sabbaths only (what the Sabbath tab shows)
SELECT id, group_id, sabbath_date, status
FROM sabbaths
WHERE sabbath_date >= CURRENT_DATE
ORDER BY sabbath_date ASC;

-- 3. Current user profile
SELECT id, role, home_group_id, full_name, display_name, is_blocked
FROM profiles
WHERE id = '<USER_ID>';

-- 4. Groups the user is a pastor of
SELECT gp.id, gp.group_id, g.name
FROM group_pastors gp
LEFT JOIN groups g ON g.id = gp.group_id
WHERE gp.user_id = '<USER_ID>';

-- 5. group_members entries for user (fallback home-church resolution)
SELECT * FROM group_members WHERE user_id = '<USER_ID>';

-- 6. Helper function checks (run while authenticated as the user
--    via "Run as user" in SQL editor, or via PostgREST)
SELECT
  is_app_admin()                   AS is_admin,
  is_church_pastor('<GROUP_ID>')   AS is_pastor,
  can_manage_sabbath('<GROUP_ID>') AS can_manage;

-- 7. Current RLS policies on sabbaths and sabbath_assignments
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('sabbaths', 'sabbath_assignments', 'sabbath_attendance')
ORDER BY tablename, policyname;

-- 8. Confirm helper function exists
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN ('is_app_admin', 'is_church_pastor', 'can_manage_sabbath');

-- 9. If can_manage_sabbath is missing, you MUST apply
--    database-fix-sabbath-permissions.sql.
