-- Fix handle_new_user trigger to always populate full_name
-- The old trigger used CONCAT which always returns a non-null string (even just ' ')
-- so COALESCE never fell through to the email fallback.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_meta_full_name TEXT;
  v_final_name TEXT;
BEGIN
  v_first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_meta_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');

  -- Build full_name from first + last, fall back to metadata full_name, then email
  v_full_name := NULLIF(TRIM(CONCAT_WS(' ', v_first_name, v_last_name)), '');
  v_final_name := COALESCE(v_full_name, v_meta_full_name, SPLIT_PART(NEW.email, '@', 1), 'User');

  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_final_name,
    v_final_name,
    'member'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN NULLIF(TRIM(COALESCE(profiles.full_name, '')), '') IS NULL
      THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    display_name = CASE
      WHEN NULLIF(TRIM(COALESCE(profiles.display_name, '')), '') IS NULL
      THEN EXCLUDED.display_name
      ELSE profiles.display_name
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing profiles that have empty/null full_name
-- Uses auth.users metadata first, then falls back to email prefix
UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(TRIM(CONCAT_WS(' ',
    NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'first_name', '')), ''),
    NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'last_name', '')), '')
  )), ''),
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
  SPLIT_PART(p.email, '@', 1),
  'User'
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR TRIM(p.full_name) = '');

-- Also fix display_name for consistency
UPDATE public.profiles
SET display_name = full_name
WHERE (display_name IS NULL OR TRIM(display_name) = '')
  AND full_name IS NOT NULL AND TRIM(full_name) != '';
