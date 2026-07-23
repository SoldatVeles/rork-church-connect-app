begin;

-- =========================================================
-- 1. AUTHENTICATED CHURCH ACCESS HELPER
-- =========================================================

create or replace function website_private.can_access_prayer_group(
  target_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.profiles profile
        where profile.id = (select auth.uid())
          and profile.role = 'admin'
      )
      or (
        target_group_id is not null
        and (
          exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.home_group_id = target_group_id
          )
          or exists (
            select 1
            from public.group_members member
            where member.user_id = (select auth.uid())
              and member.group_id = target_group_id
          )
          or exists (
            select 1
            from public.group_pastors pastor
            where pastor.user_id = (select auth.uid())
              and pastor.group_id = target_group_id
          )
        )
      )
    );
$$;

revoke all
on function website_private.can_access_prayer_group(uuid)
from public;

grant execute
on function website_private.can_access_prayer_group(uuid)
to authenticated;


-- =========================================================
-- 2. KEEP PRIVATE PRAYER READS CHURCH-SCOPED
-- =========================================================

create or replace function website_private.can_read_prayer(
  target_prayer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.prayers prayer
      where prayer.id = target_prayer_id
        and (
          prayer.created_by = (select auth.uid())
          or prayer.is_shared_all_churches = true
          or website_private.can_access_prayer_group(prayer.group_id)
        )
    );
$$;

revoke all
on function website_private.can_read_prayer(uuid)
from public;

grant execute
on function website_private.can_read_prayer(uuid)
to authenticated;


-- =========================================================
-- 3. RESTORE SAFE AUTHENTICATED PRAYER WRITES
-- =========================================================

alter table public.prayers enable row level security;

drop policy if exists "Authenticated users can create prayers"
on public.prayers;

drop policy if exists "Users can update own prayers"
on public.prayers;

drop policy if exists "Users can delete own prayers"
on public.prayers;

drop policy if exists "prayers_insert_self_or_admin"
on public.prayers;

drop policy if exists "prayers_update_self_or_admin"
on public.prayers;

drop policy if exists "prayers_delete_self_or_admin"
on public.prayers;

drop policy if exists "prayers_insert_authenticated_scoped"
on public.prayers;

drop policy if exists "prayers_update_authenticated_scoped"
on public.prayers;

drop policy if exists "prayers_delete_authenticated_scoped"
on public.prayers;

grant insert, update, delete
on table public.prayers
to authenticated;

create policy "prayers_insert_authenticated_scoped"
on public.prayers
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and website_private.can_access_prayer_group(group_id)
);

create policy "prayers_update_authenticated_scoped"
on public.prayers
for update
to authenticated
using (
  created_by = (select auth.uid())
  or website_private.can_manage_group(group_id)
)
with check (
  (
    created_by = (select auth.uid())
    and website_private.can_access_prayer_group(group_id)
  )
  or website_private.can_manage_group(group_id)
);

create policy "prayers_delete_authenticated_scoped"
on public.prayers
for delete
to authenticated
using (
  created_by = (select auth.uid())
  or website_private.can_manage_group(group_id)
);

commit;
