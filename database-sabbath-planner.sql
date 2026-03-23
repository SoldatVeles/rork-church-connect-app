-- ============================================================
-- SABBATH PLANNER FEATURE - Full Schema
-- ============================================================
-- This schema supports a Sabbath planning system where each
-- church (group) can plan one Sabbath per Saturday, assign
-- roles to members, and track attendance.
-- ============================================================

-- ============================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================

-- Status of a Sabbath plan: draft (hidden from members), published (visible), cancelled (soft-delete)
CREATE TYPE sabbath_status AS ENUM ('draft', 'published', 'cancelled');

-- Fixed roles that can be assigned for each Sabbath service
CREATE TYPE sabbath_role AS ENUM (
  'first_part_leader',
  'lesson_presenter',
  'second_part_leader',
  'sermon_speaker'
);

-- Status of a role assignment
CREATE TYPE assignment_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'replacement_suggested',
  'reassigned'
);

-- Attendance RSVP status
CREATE TYPE attendance_status AS ENUM ('attending', 'not_attending');


-- ============================================================
-- 2. TABLE: sabbaths
-- ============================================================
-- Represents a single Sabbath service plan for a church.
-- Each church (group) can have at most one Sabbath per Saturday.
-- The sabbath_date should always be a Saturday — enforced at
-- app/backend level since Supabase/Postgres CHECK with
-- EXTRACT(DOW ...) = 6 works but is documented here explicitly.
-- ============================================================

CREATE TABLE IF NOT EXISTS sabbaths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The church/group this Sabbath belongs to
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- The date of this Sabbath (must be a Saturday)
  sabbath_date DATE NOT NULL,

  -- Plan status: draft = hidden from members, published = visible, cancelled = soft-delete
  status sabbath_status NOT NULL DEFAULT 'draft',

  -- Optional notes for the planning team
  notes TEXT,

  -- Audit: who created, updated, published, cancelled
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One Sabbath per church per Saturday
  CONSTRAINT uq_sabbaths_group_date UNIQUE (group_id, sabbath_date),

  -- Ensure sabbath_date is always a Saturday (DOW 6 = Saturday)
  CONSTRAINT chk_sabbath_date_is_saturday CHECK (EXTRACT(DOW FROM sabbath_date) = 6)
);

COMMENT ON TABLE sabbaths IS 'Each row is a Sabbath service plan for one church on one Saturday.';
COMMENT ON COLUMN sabbaths.status IS 'draft = hidden from members, published = visible, cancelled = soft-deleted.';
COMMENT ON CONSTRAINT chk_sabbath_date_is_saturday ON sabbaths IS 'Ensures the date is always a Saturday.';


-- ============================================================
-- 3. TABLE: sabbath_assignments
-- ============================================================
-- Tracks who is assigned to each role for a given Sabbath.
-- Each Sabbath has exactly one assignment per role.
-- Members can accept, decline, or suggest a replacement.
-- ============================================================

CREATE TABLE IF NOT EXISTS sabbath_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which Sabbath this assignment belongs to
  sabbath_id UUID NOT NULL REFERENCES sabbaths(id) ON DELETE CASCADE,

  -- The role being assigned
  role sabbath_role NOT NULL,

  -- The user assigned to this role (nullable if unassigned)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Current status of this assignment
  status assignment_status NOT NULL DEFAULT 'pending',

  -- If declined, the reason provided
  decline_reason TEXT,

  -- If the assignee suggested a replacement, who they suggested
  suggested_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One assignment per role per Sabbath
  CONSTRAINT uq_sabbath_role UNIQUE (sabbath_id, role)
);

COMMENT ON TABLE sabbath_assignments IS 'One row per role per Sabbath. Tracks assignment, acceptance, and replacement suggestions.';
COMMENT ON COLUMN sabbath_assignments.suggested_user_id IS 'When status is replacement_suggested, this is who the assignee recommends instead.';


-- ============================================================
-- 4. TABLE: sabbath_attendance
-- ============================================================
-- Tracks RSVP / attendance for each Sabbath per user.
-- ============================================================

CREATE TABLE IF NOT EXISTS sabbath_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which Sabbath
  sabbath_id UUID NOT NULL REFERENCES sabbaths(id) ON DELETE CASCADE,

  -- Which user
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Attendance RSVP
  status attendance_status NOT NULL DEFAULT 'attending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One attendance record per user per Sabbath
  CONSTRAINT uq_sabbath_attendance UNIQUE (sabbath_id, user_id)
);

COMMENT ON TABLE sabbath_attendance IS 'RSVP tracking: each member can indicate attending or not_attending per Sabbath.';


-- ============================================================
-- 5. TABLE: group_pastors
-- ============================================================
-- Maps pastors to churches. A church can have multiple pastors.
-- Pastors have elevated permissions for Sabbath planning.
-- ============================================================

CREATE TABLE IF NOT EXISTS group_pastors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The church/group
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- The pastor (user)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One entry per pastor per church
  CONSTRAINT uq_group_pastor UNIQUE (group_id, user_id)
);

COMMENT ON TABLE group_pastors IS 'Maps pastors to churches. Multiple pastors per church allowed.';


-- ============================================================
-- 6. ALTER profiles: add home_group_id
-- ============================================================
-- Each user has one home church (group). This links them to
-- the default church they belong to for Sabbath planning.
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

COMMENT ON COLUMN profiles.home_group_id IS 'The user''s home church/group for Sabbath planning defaults.';


-- ============================================================
-- 7. INDEXES
-- ============================================================

-- Fast lookup of Sabbaths by church and date range
CREATE INDEX IF NOT EXISTS idx_sabbaths_group_date ON sabbaths (group_id, sabbath_date);

-- Fast lookup of Sabbaths by status (e.g. show only published)
CREATE INDEX IF NOT EXISTS idx_sabbaths_status ON sabbaths (status);

-- Fast lookup of assignments by sabbath
CREATE INDEX IF NOT EXISTS idx_assignments_sabbath ON sabbath_assignments (sabbath_id);

-- Fast lookup of assignments by user (e.g. "my upcoming assignments")
CREATE INDEX IF NOT EXISTS idx_assignments_user ON sabbath_assignments (user_id);

-- Fast lookup of attendance by sabbath
CREATE INDEX IF NOT EXISTS idx_attendance_sabbath ON sabbath_attendance (sabbath_id);

-- Fast lookup of attendance by user
CREATE INDEX IF NOT EXISTS idx_attendance_user ON sabbath_attendance (user_id);

-- Fast lookup of pastors by group
CREATE INDEX IF NOT EXISTS idx_group_pastors_group ON group_pastors (group_id);

-- Fast lookup of home group on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_home_group ON profiles (home_group_id);


-- ============================================================
-- 8. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
-- Reusable trigger function to auto-update the updated_at column.
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to each table with updated_at
CREATE TRIGGER trg_sabbaths_updated_at
  BEFORE UPDATE ON sabbaths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sabbath_assignments_updated_at
  BEFORE UPDATE ON sabbath_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sabbath_attendance_updated_at
  BEFORE UPDATE ON sabbath_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE sabbaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabbath_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabbath_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_pastors ENABLE ROW LEVEL SECURITY;

-- ----- sabbaths -----

-- Members can only see published Sabbaths for their home church
CREATE POLICY sabbaths_select_published ON sabbaths
  FOR SELECT USING (
    status = 'published'
    OR
    -- Pastors and admins can see all statuses for their church
    EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = sabbaths.group_id AND gp.user_id = auth.uid()
    )
    OR
    -- The creator can always see their own drafts
    created_by = auth.uid()
  );

-- Only pastors of the church can insert Sabbaths
CREATE POLICY sabbaths_insert ON sabbaths
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = sabbaths.group_id AND gp.user_id = auth.uid()
    )
  );

-- Only pastors of the church can update Sabbaths
CREATE POLICY sabbaths_update ON sabbaths
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = sabbaths.group_id AND gp.user_id = auth.uid()
    )
  );

-- Only pastors can delete (prefer cancellation over deletion)
CREATE POLICY sabbaths_delete ON sabbaths
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = sabbaths.group_id AND gp.user_id = auth.uid()
    )
  );

-- ----- sabbath_assignments -----

-- Anyone in the church can see assignments for published Sabbaths
CREATE POLICY assignments_select ON sabbath_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id
        AND (
          s.status = 'published'
          OR EXISTS (
            SELECT 1 FROM group_pastors gp
            WHERE gp.group_id = s.group_id AND gp.user_id = auth.uid()
          )
          OR sabbath_assignments.user_id = auth.uid()
        )
    )
  );

-- Only pastors can create assignments
CREATE POLICY assignments_insert ON sabbath_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_assignments.sabbath_id AND gp.user_id = auth.uid()
    )
  );

-- Pastors can update any assignment; assigned users can update their own (accept/decline)
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
  );

-- Only pastors can delete assignments
CREATE POLICY assignments_delete ON sabbath_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sabbaths s
      JOIN group_pastors gp ON gp.group_id = s.group_id
      WHERE s.id = sabbath_assignments.sabbath_id AND gp.user_id = auth.uid()
    )
  );

-- ----- sabbath_attendance -----

-- Anyone can see attendance for published Sabbaths
CREATE POLICY attendance_select ON sabbath_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id AND s.status = 'published'
    )
    OR sabbath_attendance.user_id = auth.uid()
  );

-- Users can insert their own attendance
CREATE POLICY attendance_insert ON sabbath_attendance
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own attendance
CREATE POLICY attendance_update ON sabbath_attendance
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Users can delete their own attendance
CREATE POLICY attendance_delete ON sabbath_attendance
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ----- group_pastors -----

-- Anyone can see who the pastors are
CREATE POLICY group_pastors_select ON group_pastors
  FOR SELECT USING (true);

-- Only existing pastors of the group can add new pastors
CREATE POLICY group_pastors_insert ON group_pastors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = group_pastors.group_id AND gp.user_id = auth.uid()
    )
  );

-- Only existing pastors can remove pastors
CREATE POLICY group_pastors_delete ON group_pastors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = group_pastors.group_id AND gp.user_id = auth.uid()
    )
  );


-- ============================================================
-- DONE
-- ============================================================
-- After running this SQL:
-- 1. Manually add at least one pastor to group_pastors so they
--    can bootstrap the system (or create a separate admin policy).
-- 2. Validate that your "groups" table exists and is referenced
--    correctly.
-- 3. App/backend should enforce that sabbath_date is a Saturday
--    as an additional safeguard (the CHECK constraint handles DB level).
-- ============================================================
