-- Release safety controls: member reporting, blocking, legal acceptance and
-- deletion compatibility. All public tables use RLS and are limited to the
-- authenticated member or an application administrator.

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;

comment on column public.profiles.terms_version is
  'Version of the community rules accepted during account creation.';

-- A profile is removed when its auth user is deleted. Prayer content is kept
-- for the congregation, but no longer identifies the former member.
alter table public.prayers
  drop constraint if exists prayers_requested_by_fkey;

alter table public.prayers
  add constraint prayers_requested_by_fkey
  foreign key (requested_by)
  references public.profiles(id)
  on delete set null;

create table if not exists public.member_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint member_blocks_no_self_block check (blocker_id <> blocked_id)
);

comment on table public.member_blocks is
  'Private member-level blocks. A blocker no longer sees group-chat messages from the blocked member.';

alter table public.member_blocks enable row level security;

drop policy if exists member_blocks_select_own on public.member_blocks;
create policy member_blocks_select_own
on public.member_blocks
for select
to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists member_blocks_insert_own on public.member_blocks;
create policy member_blocks_insert_own
on public.member_blocks
for insert
to authenticated
with check (
  blocker_id = (select auth.uid())
  and blocked_id <> (select auth.uid())
);

drop policy if exists member_blocks_delete_own on public.member_blocks;
create policy member_blocks_delete_own
on public.member_blocks
for delete
to authenticated
using (blocker_id = (select auth.uid()));

grant select, insert, delete on public.member_blocks to authenticated;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('group_message', 'prayer')),
  content_id uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'dismissed', 'action_taken')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint content_reports_details_length check (
    details is null or char_length(details) <= 1000
  ),
  constraint content_reports_one_report_per_member unique (reporter_id, content_type, content_id)
);

comment on table public.content_reports is
  'Private moderation reports for member-created chat messages and prayer requests.';

create index if not exists content_reports_pending_created_at_idx
  on public.content_reports (status, created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists content_reports_select_reporter_or_admin on public.content_reports;
create policy content_reports_select_reporter_or_admin
on public.content_reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or public.is_app_admin()
);

drop policy if exists content_reports_insert_reporter on public.content_reports;
create policy content_reports_insert_reporter
on public.content_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and reported_user_id is distinct from (select auth.uid())
);

drop policy if exists content_reports_update_admin on public.content_reports;
create policy content_reports_update_admin
on public.content_reports
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

grant select, insert, update on public.content_reports to authenticated;

-- Keep blocked accounts from posting and hide their old messages. Individual
-- member blocks additionally hide messages only for the member who set them.
drop policy if exists group_messages_select on public.group_messages;
create policy group_messages_select
on public.group_messages
for select
to authenticated
using (
  (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_messages.group_id
        and gm.user_id = (select auth.uid())
    )
    or public.is_home_church_member(group_messages.group_id)
    or public.is_app_admin()
  )
  and not exists (
    select 1
    from public.member_blocks mb
    where mb.blocker_id = (select auth.uid())
      and mb.blocked_id = group_messages.sender_id
  )
  and coalesce((
    select p.is_blocked
    from public.profiles p
    where p.id = group_messages.sender_id
  ), false) = false
);

drop policy if exists group_messages_insert on public.group_messages;
create policy group_messages_insert
on public.group_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and coalesce((
    select p.is_blocked
    from public.profiles p
    where p.id = (select auth.uid())
  ), false) = false
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

drop policy if exists group_messages_delete_moderators on public.group_messages;
create policy group_messages_delete_moderators
on public.group_messages
for delete
to authenticated
using (
  public.is_app_admin()
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_messages.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('admin', 'pastor', 'church_leader')
  )
);

drop policy if exists prayers_update_moderators on public.prayers;
create policy prayers_update_moderators
on public.prayers
for update
to authenticated
using (
  public.is_app_admin()
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = prayers.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('admin', 'pastor', 'church_leader')
  )
)
with check (
  public.is_app_admin()
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = prayers.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('admin', 'pastor', 'church_leader')
  )
);

-- Legacy tables are deliberately retained until a separately approved backup
-- and cleanup. They are not used by the application and cannot be reached by
-- clients because they have no policies.
