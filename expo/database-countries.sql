-- ============================================================
-- Countries + Multi-country support
-- Run this once in Supabase SQL editor.
-- ============================================================

-- 1) Countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  flag_emoji text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Switzerland + Germany
INSERT INTO countries (code, name, flag_emoji) VALUES
  ('CH', 'Switzerland', '🇨🇭'),
  ('DE', 'Germany',     '🇩🇪')
ON CONFLICT (code) DO NOTHING;

-- 2) Link groups (churches) to a country
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES countries(id) ON DELETE SET NULL;

-- Backfill all existing groups to Switzerland (current behavior)
UPDATE groups
SET country_id = (SELECT id FROM countries WHERE code = 'CH')
WHERE country_id IS NULL;

-- 3) Extra countries an admin can assign to a user
CREATE TABLE IF NOT EXISTS user_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, country_id)
);

-- 4) Indexes (the real performance win)
CREATE INDEX IF NOT EXISTS idx_groups_country_id ON groups(country_id);
CREATE INDEX IF NOT EXISTS idx_sabbaths_date_status ON sabbaths(sabbath_date, status);
CREATE INDEX IF NOT EXISTS idx_sabbaths_group_id ON sabbaths(group_id);
CREATE INDEX IF NOT EXISTS idx_user_countries_user_id ON user_countries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_countries_country_id ON user_countries(country_id);

-- 5) RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_countries ENABLE ROW LEVEL SECURITY;

-- countries: readable by everyone authenticated, writable only by admins
DROP POLICY IF EXISTS "countries_select_all" ON countries;
CREATE POLICY "countries_select_all" ON countries
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "countries_admin_insert" ON countries;
CREATE POLICY "countries_admin_insert" ON countries
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "countries_admin_update" ON countries;
CREATE POLICY "countries_admin_update" ON countries
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "countries_admin_delete" ON countries;
CREATE POLICY "countries_admin_delete" ON countries
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- user_countries: user sees their own; admins see and manage all
DROP POLICY IF EXISTS "user_countries_select_own_or_admin" ON user_countries;
CREATE POLICY "user_countries_select_own_or_admin" ON user_countries
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "user_countries_admin_write" ON user_countries;
CREATE POLICY "user_countries_admin_write" ON user_countries
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));
