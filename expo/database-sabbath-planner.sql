-- ============================================================
-- SABBATH PLANNER FEATURE - Full Schema (Revised)
-- ============================================================
-- This schema supports a Sabbath planning system where each
-- church (group) can plan one Sabbath per Saturday, assign
-- roles to members, and track attendance.
--
-- KEY DESIGN NOTES:
-- - All user FKs reference profiles(id), not auth.users(id),
--   to stay consistent with the rest of the codebase.
-- - profiles.home_group_id is the user's primary home church.
--   A user belongs to one home church but may participate in
--   events at other churches. The group_members table (if it
--   exists) can track broader participation; home_group_id is
--   the authoritative home church link.
-- - Published Sabbaths are browseable nationally (any
--   authenticated user can see them).
-- - Attendance lists are restricted to home-church members,
--   pastors of the hosting church, and admins.
-- - Cancelled Sabbaths hide assignments from normal members.
-- - Admins (profiles.role = 'admin') have full override on
--   all Sabbath operations regardless of group_pastors membership.
-- - Pastors listed in group_pastors for the hosting church
--   retain full Sabbath planning permissions.
-- ============================================================

-- ============================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE sabbath_status AS ENUM ('draft', 'published', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sabbath_role AS ENUM (
    'first_part_leader',
    'lesson_presenter',
    'second_part_leader',
    'sermon_speaker'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sabbath-specific assignment status (renamed from generic "assignment_status")
-- If the old type already exists we keep it; renaming enums in Postgres is
-- disruptive so we create under the new name only when it does not yet exist.
DO $$ BEGIN
  CREATE TYPE sabbath_assignment_status AS ENUM (
    'pending', 'accepted', 'declined', 'replacement_suggested', 'reassigned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sabbath-specific attendance RSVP status
DO $ BEGIN
  CREATE TYPE sabbath_attendance_status AS ENUM ('attending', 'not_attending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;


-- ============================================================
-- 2. HELPER: is_app_admin()
-- ============================================================
-- Returns TRUE when the current user has role = 'admin' in profiles.
-- Used throughout RLS policies for admin override support.
-- ============================================================

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 3. HELPER: is_church_pastor(target_group_id)
-- ============================================================
-- Returns TRUE when the current user is listed as a pastor of
-- the given church in the group_pastors table.
-- NOTE: This function checks group_pastors ONLY. It does NOT
-- check profiles.role or profiles.home_group_id.
-- ============================================================

CREATE OR REPLACE FUNCTION is_church_pastor(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_pastors gp
    WHERE gp.group_id = _group_id AND gp.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 4. HELPER: is_home_church_member(target_group_id)
-- ============================================================
-- Returns TRUE when the current user's home_group_id matches.
-- ============================================================

CREATE OR REPLACE FUNCTION is_home_church_member(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND home_group_id = _group_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- 5. TABLE: sabbaths
-- ============================================================
-- One row per Sabbath service plan for one church on one Saturday.
-- Published Sabbaths are nationally browseable by any authenticated user.
-- Draft Sabbaths are visible to admins, church pastors, and the original creator.
-- Cancelled Sabbaths are visible only to admins and church pastors.
-- ============================================================

CREATE TABLE IF NOT EXISTS sabbaths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  sabbath_date DATE NOT NULL,

  status sabbath_status NOT NULL DEFAULT 'draft',

  notes TEXT,

  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_sabbaths_group_date UNIQUE (group_id, sabbath_date),
  CONSTRAINT chk_sabbath_date_is_saturday CHECK (EXTRACT(DOW FROM sabbath_date) = 6)
);

COMMENT ON TABLE sabbaths IS 'Each row is a Sabbath service plan for one church on one Saturday.';
COMMENT ON COLUMN sabbaths.status IS 'draft = hidden from regular members, published = nationally browseable, cancelled = soft-deleted.';
COMMENT ON CONSTRAINT chk_sabbath_date_is_saturday ON sabbaths IS 'Ensures the date is always a Saturday.';


-- ============================================================
-- 6. TABLE: sabbath_assignments
-- ============================================================
-- Tracks who is assigned to each role for a given Sabbath.
-- Each Sabbath has exactly one assignment per role.
-- Assigned users can decline and optionally suggest a replacement.
-- ============================================================

CREATE TABLE IF NOT EXISTS sabbath_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sabbath_id UUID NOT NULL REFERENCES sabbaths(id) ON DELETE CASCADE,

  role sabbath_role NOT NULL,

  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  status sabbath_assignment_status NOT NULL DEFAULT 'pending',

  decline_reason TEXT,

  suggested_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_sabbath_role UNIQUE (sabbath_id, role)
);

COMMENT ON TABLE sabbath_assignments IS 'One row per role per Sabbath. Tracks assignment and replacement suggestions.';
COMMENT ON COLUMN sabbath_assignments.suggested_user_id IS 'When status is replacement_suggested, this is who the assignee recommends instead.';


-- ============================================================
-- 7. TABLE: sabbath_attendance
-- ============================================================
-- Tracks RSVP / attendance for each Sabbath per user.
-- Attendance lists are restricted to the hosting church's members,
-- its pastors, and app-wide admins. Other churches cannot see
-- who is attending.
-- ============================================================

CREATE TABLE IF NOT EXISTS sabbath_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sabbath_id UUID NOT NULL REFERENCES sabbaths(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status sabbath_attendance_status NOT NULL DEFAULT 'attending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_sabbath_attendance UNIQUE (sabbath_id, user_id)
);

COMMENT ON TABLE sabbath_attendance IS 'RSVP tracking. Attendance lists are only visible to home-church members, hosting-church pastors, and admins.';


-- ============================================================
-- 8. TABLE: group_pastors
-- ============================================================
-- Maps pastors to churches. A church can have multiple pastors.
-- Pastors have elevated permissions for Sabbath planning in
-- their church. Admins can also manage pastors for any church.
-- ============================================================

CREATE TABLE IF NOT EXISTS group_pastors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_group_pastor UNIQUE (group_id, user_id)
);

COMMENT ON TABLE group_pastors IS 'Maps pastors to churches. Multiple pastors per church allowed. Admins bypass this for management.';


-- ============================================================
-- 9. ALTER profiles: add home_group_id
-- ============================================================
-- Each user has one home church (group) via home_group_id.
-- This is the primary church the user belongs to for Sabbath
-- planning, attendance visibility, and member list grouping.
-- Users may still participate in events at other churches,
-- but home_group_id is the authoritative home church link.
-- The group_members table (managed elsewhere) can track
-- broader cross-church participation if needed.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'home_group_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN home_group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN profiles.home_group_id IS 'The user''s primary home church/group. Determines default Sabbath planning context and attendance visibility.';


-- ============================================================
-- 10. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sabbaths_group_date ON sabbaths (group_id, sabbath_date);
CREATE INDEX IF NOT EXISTS idx_sabbaths_status ON sabbaths (status);
CREATE INDEX IF NOT EXISTS idx_assignments_sabbath ON sabbath_assignments (sabbath_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON sabbath_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sabbath ON sabbath_attendance (sabbath_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON sabbath_attendance (user_id);
CREATE INDEX IF NOT EXISTS idx_group_pastors_group ON group_pastors (group_id);
CREATE INDEX IF NOT EXISTS idx_group_pastors_user ON group_pastors (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_home_group ON profiles (home_group_id);


-- ============================================================
-- 11. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sabbaths_updated_at ON sabbaths;
CREATE TRIGGER trg_sabbaths_updated_at
  BEFORE UPDATE ON sabbaths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sabbath_assignments_updated_at ON sabbath_assignments;
CREATE TRIGGER trg_sabbath_assignments_updated_at
  BEFORE UPDATE ON sabbath_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sabbath_attendance_updated_at ON sabbath_attendance;
CREATE TRIGGER trg_sabbath_attendance_updated_at
  BEFORE UPDATE ON sabbath_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE sabbaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabbath_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabbath_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_pastors ENABLE ROW LEVEL SECURITY;

-- ----- sabbaths -----

DROP POLICY IF EXISTS sabbaths_select_published ON sabbaths;
DROP POLICY IF EXISTS sabbaths_select ON sabbaths;
DROP POLICY IF EXISTS sabbaths_insert ON sabbaths;
DROP POLICY IF EXISTS sabbaths_update ON sabbaths;
DROP POLICY IF EXISTS sabbaths_delete ON sabbaths;

-- SELECT: published Sabbaths are nationally browseable by any authenticated user.
-- Draft Sabbaths are visible to admins, hosting-church pastors, or the original creator
-- (creator access is kept so the user who started a draft can still find and edit it
-- even if they are not formally in group_pastors, e.g. an admin who later lost the role).
-- Cancelled Sabbaths are visible only to admins and hosting-church pastors
-- (the creator does NOT get automatic access to cancelled rows to prevent leaking
-- assignment data that was cleared on cancellation).
CREATE POLICY sabbaths_select ON sabbaths
  FOR SELECT USING (
    (status = 'published' AND auth.uid() IS NOT NULL)
    OR is_app_admin()
    OR is_church_pastor(group_id)
    OR (status = 'draft' AND created_by = auth.uid())
  );

-- INSERT: admins or pastors of the hosting church can create Sabbaths.
CREATE POLICY sabbaths_insert ON sabbaths
  FOR INSERT WITH CHECK (
    is_app_admin()
    OR is_church_pastor(group_id)
  );

-- UPDATE: admins or pastors of the hosting church can update Sabbaths.
CREATE POLICY sabbaths_update ON sabbaths
  FOR UPDATE USING (
    is_app_admin()
    OR is_church_pastor(group_id)
  );

-- DELETE: admins or pastors of the hosting church can delete (prefer cancellation).
CREATE POLICY sabbaths_delete ON sabbaths
  FOR DELETE USING (
    is_app_admin()
    OR is_church_pastor(group_id)
  );


-- ----- sabbath_assignments -----

DROP POLICY IF EXISTS assignments_select ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_insert ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_update ON sabbath_assignments;
DROP POLICY IF EXISTS assignments_delete ON sabbath_assignments;

-- SELECT: For published Sabbaths, any authenticated user can see assignments
-- (since published Sabbaths are nationally browseable, their roles are public info).
-- For draft Sabbaths, admins, pastors, and the creator can see.
-- For cancelled Sabbaths, only admins and pastors can see (not normal members or creator).
-- An assigned user can always see their own assignment row regardless of Sabbath status.
CREATE POLICY assignments_select ON sabbath_assignments
  FOR SELECT USING (
    sabbath_assignments.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND (
          (s.status = 'published' AND auth.uid() IS NOT NULL)
          OR is_church_pastor(s.group_id)
          OR (s.status = 'draft' AND s.created_by = auth.uid())
        )
    )
  );

-- INSERT: admins or pastors of the hosting church can assign any user.
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND is_church_pastor(s.group_id)
    )
  );

-- UPDATE: admins, pastors of the hosting church, or the assigned user themselves
-- (e.g. to decline or suggest a replacement).
CREATE POLICY assignments_update ON sabbath_assignments
  FOR UPDATE USING (
    is_app_admin()
    OR sabbath_assignments.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND is_church_pastor(s.group_id)
    )
  );

-- DELETE: admins or pastors of the hosting church.
CREATE POLICY assignments_delete ON sabbath_assignments
  FOR DELETE USING (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND is_church_pastor(s.group_id)
    )
  );


-- ----- sabbath_attendance -----

DROP POLICY IF EXISTS attendance_select ON sabbath_attendance;
DROP POLICY IF EXISTS attendance_insert ON sabbath_attendance;
DROP POLICY IF EXISTS attendance_update ON sabbath_attendance;
DROP POLICY IF EXISTS attendance_delete ON sabbath_attendance;

-- SELECT: Attendance is NOT globally visible.
-- A user can always see their own attendance rows.
-- Home-church members (same group_id) can see the attendance list for their church's Sabbaths.
-- Pastors of the hosting church and admins can see all attendance.
CREATE POLICY attendance_select ON sabbath_attendance
  FOR SELECT USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id
        AND s.status = 'published'
        AND (
          is_church_pastor(s.group_id)
          OR is_home_church_member(s.group_id)
        )
    )
  );

-- INSERT: users can insert their own attendance.
CREATE POLICY attendance_insert ON sabbath_attendance
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- UPDATE: users can update their own attendance; admins and pastors can update any.
CREATE POLICY attendance_update ON sabbath_attendance
  FOR UPDATE USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id
        AND is_church_pastor(s.group_id)
    )
  );

-- DELETE: users can delete their own; admins and pastors can delete any.
CREATE POLICY attendance_delete ON sabbath_attendance
  FOR DELETE USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id
        AND is_church_pastor(s.group_id)
    )
  );


-- ----- group_pastors -----

DROP POLICY IF EXISTS group_pastors_select ON group_pastors;
DROP POLICY IF EXISTS group_pastors_insert ON group_pastors;
DROP POLICY IF EXISTS group_pastors_delete ON group_pastors;

-- SELECT: anyone authenticated can see who the pastors are.
CREATE POLICY group_pastors_select ON group_pastors
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: admins can add pastors to any church; existing pastors of the church can add new pastors.
CREATE POLICY group_pastors_insert ON group_pastors
  FOR INSERT WITH CHECK (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = group_pastors.group_id AND gp.user_id = auth.uid()
    )
  );

-- DELETE: admins can remove pastors from any church; existing pastors can remove pastors in their church.
CREATE POLICY group_pastors_delete ON group_pastors
  FOR DELETE USING (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = group_pastors.group_id AND gp.user_id = auth.uid()
    )
  );


-- ============================================================
-- DONE
-- ============================================================
-- After running this SQL:
-- 1. Ensure at least one user has role = 'admin' in profiles so
--    they can bootstrap group_pastors and Sabbath data.
-- 2. Validate that your "groups" and "profiles" tables exist.
-- 3. App/backend enforces sabbath_date is a Saturday as an
--    additional safeguard (the CHECK constraint handles DB level).
-- ============================================================
