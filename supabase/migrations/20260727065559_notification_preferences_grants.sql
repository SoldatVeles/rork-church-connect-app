-- Supabase may apply broad default privileges to newly created public tables.
-- Notification preferences only need read and upsert access from the app.
revoke all on table public.notification_preferences from authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
