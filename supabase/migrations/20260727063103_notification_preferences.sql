-- Per-user notification categories. Operational and account notices are not
-- represented here and therefore remain visible to the affected user.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  events boolean not null default true,
  prayers boolean not null default true,
  sabbath_updates boolean not null default true,
  church_announcements boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

revoke all on table public.notification_preferences from anon;
grant select, insert, update on table public.notification_preferences to authenticated;

drop policy if exists "Users can read their notification preferences"
  on public.notification_preferences;
create policy "Users can read their notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can create their notification preferences"
  on public.notification_preferences;
create policy "Users can create their notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their notification preferences"
  on public.notification_preferences;
create policy "Users can update their notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
