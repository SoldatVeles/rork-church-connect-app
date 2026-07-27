-- Align church chat access with the canonical home-church relationship,
-- enable realtime chat delivery, and tighten profile write policies.

drop policy if exists group_messages_select on public.group_messages;
create policy group_messages_select
on public.group_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_messages.group_id
      and gm.user_id = (select auth.uid())
  )
  or public.is_home_church_member(group_messages.group_id)
  or public.is_app_admin()
);

drop policy if exists group_messages_insert on public.group_messages;
create policy group_messages_insert
on public.group_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_messages.group_id
        and gm.user_id = (select auth.uid())
    )
    or public.is_home_church_member(group_messages.group_id)
    or public.is_app_admin()
  )
);

alter table public.group_messages
  drop constraint if exists group_messages_content_length_check;

alter table public.group_messages
  add constraint group_messages_content_length_check
  check (char_length(btrim(content)) between 1 and 1000);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or public.is_app_admin()
)
with check (
  id = (select auth.uid())
  or public.is_app_admin()
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.group_messages';
  end if;
end
$$;
