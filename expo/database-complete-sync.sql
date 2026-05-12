-- ============================================================
-- COMPLETE DATABASE SYNC SCRIPT
-- ============================================================
-- Single, idempotent script that creates every table, enum,
-- index, trigger, RLS policy, and helper function the Expo app
-- expects. Safe to re-run on an existing database.
--
-- Run this in the Supabase SQL Editor (or via psql) once.
-- After running:
--   1) Promote one user to admin:
--      UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
--   2) Optionally insert a default church / group.
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. SHARED HELPER: update_updated_at_column()
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 2. ENUMS (Sabbath module)
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

DO $$ BEGIN
  CREATE TYPE sabbath_assignment_status AS ENUM (
    'pending', 'accepted', 'declined', 'replacement_suggested', 'reassigned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sabbath_attendance_status AS ENUM ('attending', 'not_attending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 3. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  display_name TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'member',
  is_blocked  BOOLEAN DEFAULT FALSE,
  home_group_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make sure all expected columns exist on older databases
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS home_group_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Allowed roles
-- Normalize the role column to TEXT so the CHECK constraint can hold all
-- role values going forward. The legacy user_role ENUM (if any) must already
-- include every value the app uses (incl. 'visitor'); ALTER TYPE ADD VALUE
-- cannot run inside a DO block, so we keep this step purely as a column
-- type normalization.
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

  IF col_type = 'USER-DEFINED' THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::TEXT;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';
  END IF;
END $$;

-- Enforce the set of allowed role values on the TEXT column
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('visitor', 'member', 'pastor', 'church_leader', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_home_group ON public.profiles(home_group_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 4. GROUPS  (the "church" entity used app-wide)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_home_group_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_group_id_fkey
  FOREIGN KEY (home_group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS groups_select_all ON public.groups;
CREATE POLICY groups_select_all ON public.groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS groups_manage_admin ON public.groups;
CREATE POLICY groups_manage_admin ON public.groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 5. CHURCHES (separate listing the church-provider also reads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.churches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS churches_select_all ON public.churches;
CREATE POLICY churches_select_all ON public.churches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS churches_manage_admin ON public.churches;
CREATE POLICY churches_manage_admin ON public.churches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP TRIGGER IF EXISTS update_churches_updated_at ON public.churches;
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 6. GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_members_select ON public.group_members;
CREATE POLICY group_members_select ON public.group_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS group_members_manage ON public.group_members;
CREATE POLICY group_members_manage ON public.group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );


-- ============================================================
-- 7. GROUP PASTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_pastors (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_pastors_group ON public.group_pastors(group_id);
CREATE INDEX IF NOT EXISTS idx_group_pastors_user  ON public.group_pastors(user_id);

ALTER TABLE public.group_pastors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_pastors_select ON public.group_pastors;
CREATE POLICY group_pastors_select ON public.group_pastors
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS group_pastors_insert ON public.group_pastors;
CREATE POLICY group_pastors_insert ON public.group_pastors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = group_pastors.group_id AND gp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS group_pastors_delete ON public.group_pastors;
CREATE POLICY group_pastors_delete ON public.group_pastors
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM group_pastors gp
      WHERE gp.group_id = group_pastors.group_id AND gp.user_id = auth.uid()
    )
  );


-- ============================================================
-- 8. GROUP MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON public.group_messages(created_at);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_messages_select ON public.group_messages;
CREATE POLICY group_messages_select ON public.group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_messages.group_id
        AND gm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS group_messages_insert ON public.group_messages;
CREATE POLICY group_messages_insert ON public.group_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = group_messages.group_id
          AND gm.user_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );


-- ============================================================
-- 9. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT NOT NULL,
  description          TEXT,
  start_at             TIMESTAMPTZ NOT NULL,
  end_at               TIMESTAMPTZ,
  location             TEXT,
  event_type           TEXT NOT NULL DEFAULT 'sabbath',
  max_attendees        INTEGER,
  current_attendees    INTEGER NOT NULL DEFAULT 0,
  registered_users     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  image_url            TEXT,
  group_id             UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference'));

CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_start_at   ON public.events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_group      ON public.events(group_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_all ON public.events;
CREATE POLICY events_select_all ON public.events
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS events_insert_leader ON public.events;
CREATE POLICY events_insert_leader ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS events_update_leader ON public.events;
CREATE POLICY events_update_leader ON public.events
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS events_delete_leader ON public.events;
CREATE POLICY events_delete_leader ON public.events
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 10. PRAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prayers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  category                TEXT DEFAULT 'general',
  is_anonymous            BOOLEAN NOT NULL DEFAULT FALSE,
  is_answered             BOOLEAN NOT NULL DEFAULT FALSE,
  group_id                UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  is_shared_all_churches  BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at             TIMESTAMPTZ,
  visibility              TEXT NOT NULL DEFAULT 'public',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prayers
  ADD COLUMN IF NOT EXISTS is_shared_all_churches BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

ALTER TABLE public.prayers DROP CONSTRAINT IF EXISTS prayers_visibility_check;
ALTER TABLE public.prayers
  ADD CONSTRAINT prayers_visibility_check
  CHECK (visibility IN ('public', 'group', 'private'));

CREATE INDEX IF NOT EXISTS idx_prayers_group     ON public.prayers(group_id);
CREATE INDEX IF NOT EXISTS idx_prayers_created_by ON public.prayers(created_by);
CREATE INDEX IF NOT EXISTS idx_prayers_answered  ON public.prayers(is_answered);

ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayers_select_all ON public.prayers;
CREATE POLICY prayers_select_all ON public.prayers
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS prayers_insert_self ON public.prayers;
CREATE POLICY prayers_insert_self ON public.prayers
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS prayers_update_self_or_admin ON public.prayers;
CREATE POLICY prayers_update_self_or_admin ON public.prayers
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS prayers_delete_self_or_admin ON public.prayers;
CREATE POLICY prayers_delete_self_or_admin ON public.prayers
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP TRIGGER IF EXISTS update_prayers_updated_at ON public.prayers;
CREATE TRIGGER update_prayers_updated_at
  BEFORE UPDATE ON public.prayers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 11. PRAYER UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prayer_updates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id           UUID NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  is_answered_update  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer ON public.prayer_updates(prayer_id);

ALTER TABLE public.prayer_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayer_updates_select ON public.prayer_updates;
CREATE POLICY prayer_updates_select ON public.prayer_updates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS prayer_updates_insert ON public.prayer_updates;
CREATE POLICY prayer_updates_insert ON public.prayer_updates
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM prayers p
        WHERE p.id = prayer_updates.prayer_id AND p.created_by = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
    )
  );


-- ============================================================
-- 12. PRAYER PRAYERS (who-is-praying junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prayer_prayers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  UUID NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_prayer_prayers_prayer ON public.prayer_prayers(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_prayers_user   ON public.prayer_prayers(user_id);

ALTER TABLE public.prayer_prayers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayer_prayers_select ON public.prayer_prayers;
CREATE POLICY prayer_prayers_select ON public.prayer_prayers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS prayer_prayers_insert_self ON public.prayer_prayers;
CREATE POLICY prayer_prayers_insert_self ON public.prayer_prayers
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prayer_prayers_delete_self ON public.prayer_prayers;
CREATE POLICY prayer_prayers_delete_self ON public.prayer_prayers
  FOR DELETE USING (user_id = auth.uid());


-- ============================================================
-- 13. NOTIFICATIONS + USER NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link_path  TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_all ON public.notifications;
CREATE POLICY notifications_select_all ON public.notifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_insert_leader ON public.notifications;
CREATE POLICY notifications_insert_leader ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS notifications_delete_leader ON public.notifications;
CREATE POLICY notifications_delete_leader ON public.notifications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user    ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notif   ON public.user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_deleted ON public.user_notifications(user_id, is_deleted);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_select_self ON public.user_notifications;
CREATE POLICY user_notifications_select_self ON public.user_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_notifications_manage_self ON public.user_notifications;
CREATE POLICY user_notifications_manage_self ON public.user_notifications
  FOR ALL USING (user_id = auth.uid());


-- ============================================================
-- 14. SERMONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sermons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  speaker       TEXT NOT NULL,
  date          TEXT NOT NULL,
  duration      TEXT NOT NULL,
  description   TEXT NOT NULL,
  topic         TEXT NOT NULL,
  youtube_url   TEXT,
  thumbnail_url TEXT,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sermons_date_idx        ON public.sermons(date DESC);
CREATE INDEX IF NOT EXISTS sermons_is_featured_idx ON public.sermons(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS sermons_created_by_idx  ON public.sermons(created_by);

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sermons_read_all ON public.sermons;
CREATE POLICY sermons_read_all ON public.sermons FOR SELECT USING (true);

DROP POLICY IF EXISTS sermons_insert_admin_pastor ON public.sermons;
CREATE POLICY sermons_insert_admin_pastor ON public.sermons
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS sermons_update_admin_pastor ON public.sermons;
CREATE POLICY sermons_update_admin_pastor ON public.sermons
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP POLICY IF EXISTS sermons_delete_admin_pastor ON public.sermons;
CREATE POLICY sermons_delete_admin_pastor ON public.sermons
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'church_leader'))
  );

DROP TRIGGER IF EXISTS update_sermons_updated_at ON public.sermons;
CREATE TRIGGER update_sermons_updated_at
  BEFORE UPDATE ON public.sermons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 15. SABBATH HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_church_pastor(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_pastors gp
    WHERE gp.group_id = _group_id AND gp.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_home_church_member(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND home_group_id = _group_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- 16. SABBATHS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sabbaths (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sabbath_date        DATE NOT NULL,
  status              sabbath_status NOT NULL DEFAULT 'draft',
  notes               TEXT,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at        TIMESTAMPTZ,
  cancelled_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sabbaths_group_date UNIQUE (group_id, sabbath_date),
  CONSTRAINT chk_sabbath_date_is_saturday CHECK (EXTRACT(DOW FROM sabbath_date) = 6)
);

CREATE INDEX IF NOT EXISTS idx_sabbaths_group_date ON public.sabbaths(group_id, sabbath_date);
CREATE INDEX IF NOT EXISTS idx_sabbaths_status     ON public.sabbaths(status);

ALTER TABLE public.sabbaths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sabbaths_select ON public.sabbaths;
CREATE POLICY sabbaths_select ON public.sabbaths
  FOR SELECT USING (
    (status = 'published' AND auth.uid() IS NOT NULL)
    OR is_app_admin()
    OR is_church_pastor(group_id)
    OR (status = 'draft' AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS sabbaths_insert ON public.sabbaths;
CREATE POLICY sabbaths_insert ON public.sabbaths
  FOR INSERT WITH CHECK (is_app_admin() OR is_church_pastor(group_id));

DROP POLICY IF EXISTS sabbaths_update ON public.sabbaths;
CREATE POLICY sabbaths_update ON public.sabbaths
  FOR UPDATE USING (is_app_admin() OR is_church_pastor(group_id));

DROP POLICY IF EXISTS sabbaths_delete ON public.sabbaths;
CREATE POLICY sabbaths_delete ON public.sabbaths
  FOR DELETE USING (is_app_admin() OR is_church_pastor(group_id));

DROP TRIGGER IF EXISTS trg_sabbaths_updated_at ON public.sabbaths;
CREATE TRIGGER trg_sabbaths_updated_at
  BEFORE UPDATE ON public.sabbaths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 17. SABBATH ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sabbath_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sabbath_id        UUID NOT NULL REFERENCES public.sabbaths(id) ON DELETE CASCADE,
  role              sabbath_role NOT NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status            sabbath_assignment_status NOT NULL DEFAULT 'pending',
  decline_reason    TEXT,
  suggested_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sabbath_role UNIQUE (sabbath_id, role)
);

CREATE INDEX IF NOT EXISTS idx_assignments_sabbath ON public.sabbath_assignments(sabbath_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user    ON public.sabbath_assignments(user_id);

ALTER TABLE public.sabbath_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assignments_select ON public.sabbath_assignments;
CREATE POLICY assignments_select ON public.sabbath_assignments
  FOR SELECT USING (
    is_app_admin()
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

DROP POLICY IF EXISTS assignments_insert ON public.sabbath_assignments;
CREATE POLICY assignments_insert ON public.sabbath_assignments
  FOR INSERT WITH CHECK (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id AND is_church_pastor(s.group_id)
    )
  );

DROP POLICY IF EXISTS assignments_update ON public.sabbath_assignments;
CREATE POLICY assignments_update ON public.sabbath_assignments
  FOR UPDATE USING (
    is_app_admin()
    OR sabbath_assignments.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id AND is_church_pastor(s.group_id)
    )
  );

DROP POLICY IF EXISTS assignments_delete ON public.sabbath_assignments;
CREATE POLICY assignments_delete ON public.sabbath_assignments
  FOR DELETE USING (
    is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_assignments.sabbath_id AND is_church_pastor(s.group_id)
    )
  );

DROP TRIGGER IF EXISTS trg_sabbath_assignments_updated_at ON public.sabbath_assignments;
CREATE TRIGGER trg_sabbath_assignments_updated_at
  BEFORE UPDATE ON public.sabbath_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 18. SABBATH ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sabbath_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sabbath_id  UUID NOT NULL REFERENCES public.sabbaths(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      sabbath_attendance_status NOT NULL DEFAULT 'attending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sabbath_attendance UNIQUE (sabbath_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_sabbath ON public.sabbath_attendance(sabbath_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user    ON public.sabbath_attendance(user_id);

ALTER TABLE public.sabbath_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_select ON public.sabbath_attendance;
CREATE POLICY attendance_select ON public.sabbath_attendance
  FOR SELECT USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id
        AND s.status = 'published'
        AND (is_church_pastor(s.group_id) OR is_home_church_member(s.group_id))
    )
  );

DROP POLICY IF EXISTS attendance_insert ON public.sabbath_attendance;
CREATE POLICY attendance_insert ON public.sabbath_attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS attendance_update ON public.sabbath_attendance;
CREATE POLICY attendance_update ON public.sabbath_attendance
  FOR UPDATE USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id AND is_church_pastor(s.group_id)
    )
  );

DROP POLICY IF EXISTS attendance_delete ON public.sabbath_attendance;
CREATE POLICY attendance_delete ON public.sabbath_attendance
  FOR DELETE USING (
    sabbath_attendance.user_id = auth.uid()
    OR is_app_admin()
    OR EXISTS (
      SELECT 1 FROM sabbaths s
      WHERE s.id = sabbath_attendance.sabbath_id AND is_church_pastor(s.group_id)
    )
  );

DROP TRIGGER IF EXISTS trg_sabbath_attendance_updated_at ON public.sabbath_attendance;
CREATE TRIGGER trg_sabbath_attendance_updated_at
  BEFORE UPDATE ON public.sabbath_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 19. AUTH TRIGGER: create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_value TEXT;
BEGIN
  full_name_value := COALESCE(
    NULLIF(TRIM(CONCAT(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )), ''),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );

  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (NEW.id, NEW.email, full_name_value, full_name_value, 'member')
  ON CONFLICT (id) DO UPDATE
  SET
    email        = EXCLUDED.email,
    full_name    = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 20. GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON public.churches, public.groups TO anon;


-- ============================================================
-- 21. VERIFICATION
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- DONE. Next steps:
--   UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
--   INSERT INTO groups (name) VALUES ('Main Church');
-- ============================================================
