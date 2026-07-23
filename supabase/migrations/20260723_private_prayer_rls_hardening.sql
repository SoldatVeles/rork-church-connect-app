begin;

-- =========================================================
-- 1. PRIVATE PRAYER READ HELPER
-- =========================================================

-- Keep all private prayer visibility decisions in one security-definer
-- function. This also lets the child-table policies check their parent
-- prayer without creating recursive RLS evaluations.

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
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and (
                profile.role = 'admin'
                or profile.home_group_id = prayer.group_id
              )
          )
          or exists (
            select 1
            from public.group_members member
            where member.user_id = (select auth.uid())
              and member.group_id = prayer.group_id
          )
          or exists (
            select 1
            from public.group_pastors pastor
            where pastor.user_id = (select auth.uid())
              and pastor.group_id = prayer.group_id
          )
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
-- 2. PRIVATE PRAYERS
-- =========================================================

alter table public.prayers enable row level security;

-- These names come from the historical setup files. Some installations
-- may contain only a subset, so every removal is intentionally idempotent.

drop policy if exists "Public prayers are viewable by everyone"
on public.prayers;

drop policy if exists "View prayers scoped to church or shared"
on public.prayers;

drop policy if exists "prayers_read_by_visibility"
on public.prayers;

drop policy if exists "prayers_select_all"
on public.prayers;

drop policy if exists "prayers_select_authenticated_scoped"
on public.prayers;

revoke all privileges
on table public.prayers
from anon;

grant select
on table public.prayers
to authenticated;

create policy "prayers_select_authenticated_scoped"
on public.prayers
for select
to authenticated
using (
  website_private.can_read_prayer(id)
);


-- =========================================================
-- 3. PRIVATE PRAYER UPDATES
-- =========================================================

alter table public.prayer_updates enable row level security;

drop policy if exists "Anyone can view prayer updates"
on public.prayer_updates;

drop policy if exists "prayer_updates_select_authenticated_scoped"
on public.prayer_updates;

revoke all privileges
on table public.prayer_updates
from anon;

grant select
on table public.prayer_updates
to authenticated;

create policy "prayer_updates_select_authenticated_scoped"
on public.prayer_updates
for select
to authenticated
using (
  website_private.can_read_prayer(prayer_id)
);


-- =========================================================
-- 4. PRIVATE PRAYER PARTICIPATION
-- =========================================================

alter table public.prayer_prayers enable row level security;

drop policy if exists "Prayer prayers are viewable by everyone"
on public.prayer_prayers;

drop policy if exists "prayer_prayers_select"
on public.prayer_prayers;

drop policy if exists "prayer_prayers_select_authenticated"
on public.prayer_prayers;

drop policy if exists "prayer_prayers_select_authenticated_scoped"
on public.prayer_prayers;

revoke all privileges
on table public.prayer_prayers
from anon;

grant select
on table public.prayer_prayers
to authenticated;

create policy "prayer_prayers_select_authenticated_scoped"
on public.prayer_prayers
for select
to authenticated
using (
  website_private.can_read_prayer(prayer_id)
);

commit;
