begin;

-- =========================================================
-- 1. SECURE THE LEGACY UNREAD-NOTIFICATIONS VIEW
-- =========================================================

alter table public.notification_recipients enable row level security;

drop policy if exists "notification_recipients_select_own"
on public.notification_recipients;

create policy "notification_recipients_select_own"
on public.notification_recipients
for select
to authenticated
using (
  user_id = (select auth.uid())
);

grant select
on table public.notification_recipients
to authenticated;

create or replace view public.v_unread_notifications
with (security_invoker = true)
as
select
  notification.id,
  notification.type,
  notification.title,
  notification.body,
  notification.link_path,
  notification.created_by,
  notification.created_at,
  recipient.user_id,
  recipient.is_read,
  recipient.read_at
from public.notifications notification
join public.notification_recipients recipient
  on recipient.notification_id = notification.id
where recipient.is_read = false
  and recipient.user_id = (select auth.uid());

revoke all privileges
on table public.v_unread_notifications
from public, anon, authenticated;

grant select
on table public.v_unread_notifications
to authenticated;


-- =========================================================
-- 2. SCOPE THE NOTIFICATION-RECIPIENT HELPER
-- =========================================================

create or replace function public.get_church_notification_recipient_ids(
  target_group_id uuid,
  extra_user_ids uuid[] default array[]::uuid[]
)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with caller_access as (
    select exists (
      select 1
      from public.profiles caller
      where caller.id = (select auth.uid())
        and coalesce(caller.is_blocked, false) = false
        and (
          caller.role = 'admin'
          or caller.home_group_id = target_group_id
          or exists (
            select 1
            from public.group_members member
            where member.user_id = caller.id
              and member.group_id = target_group_id
          )
          or exists (
            select 1
            from public.group_pastors pastor
            where pastor.user_id = caller.id
              and pastor.group_id = target_group_id
          )
        )
    ) as allowed
  ),
  recipients as (
    select profile.id as recipient_id
    from public.profiles profile
    where profile.home_group_id = target_group_id
      and coalesce(profile.is_blocked, false) = false

    union

    select member.user_id as recipient_id
    from public.group_members member
    join public.profiles profile
      on profile.id = member.user_id
    where member.group_id = target_group_id
      and coalesce(profile.is_blocked, false) = false

    union

    select pastor.user_id as recipient_id
    from public.group_pastors pastor
    join public.profiles profile
      on profile.id = pastor.user_id
    where pastor.group_id = target_group_id
      and coalesce(profile.is_blocked, false) = false

    union

    select profile.id as recipient_id
    from public.profiles profile
    where profile.id = any(extra_user_ids)
      and coalesce(profile.is_blocked, false) = false
  )
  select recipient_id as user_id
  from recipients
  cross join caller_access
  where caller_access.allowed
    and recipient_id is not null;
$$;


-- =========================================================
-- 3. REMOVE IMPLICIT EXECUTION OF PRIVILEGED FUNCTIONS
-- =========================================================

revoke execute on function
  public.admin_assign_pastor_to_church(uuid, uuid),
  public.admin_remove_pastor_from_church(uuid, uuid),
  public.assign_sabbath_role(uuid, public.sabbath_role, uuid),
  public.can_manage_sabbath(uuid),
  public.cancel_sabbath_plan(uuid, text),
  public.decline_sabbath_assignment_with_notifications(uuid, text),
  public.get_church_notification_recipient_ids(uuid, uuid[]),
  public.get_sabbath_assignable_members(uuid),
  public.handle_new_user(),
  public.is_app_admin(),
  public.is_church_pastor(uuid),
  public.is_home_church_member(uuid),
  public.mark_notification_read(uuid),
  public.notify_admins_on_new_profile(),
  public.notify_sabbath_assignment_declined(),
  public.toggle_event_registration(uuid),
  public.update_user_role_admin(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.admin_assign_pastor_to_church(uuid, uuid),
  public.admin_remove_pastor_from_church(uuid, uuid),
  public.assign_sabbath_role(uuid, public.sabbath_role, uuid),
  public.can_manage_sabbath(uuid),
  public.cancel_sabbath_plan(uuid, text),
  public.decline_sabbath_assignment_with_notifications(uuid, text),
  public.get_church_notification_recipient_ids(uuid, uuid[]),
  public.get_sabbath_assignable_members(uuid),
  public.is_app_admin(),
  public.is_church_pastor(uuid),
  public.is_home_church_member(uuid),
  public.mark_notification_read(uuid),
  public.toggle_event_registration(uuid),
  public.update_user_role_admin(uuid, text)
to authenticated;


-- =========================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =========================================================

alter function public.can_manage_sabbath(uuid)
set search_path = public;

alter function public.handle_new_user()
set search_path = public;

alter function public.is_app_admin()
set search_path = public;

alter function public.is_church_pastor(uuid)
set search_path = public;

alter function public.is_home_church_member(uuid)
set search_path = public;

alter function public.mark_notification_read(uuid)
set search_path = public;

alter function public.notify_admins_on_new_profile()
set search_path = public;

alter function public.groups_propagate_country_id_to_sabbaths()
set search_path = public;

alter function public.is_admin(uuid)
set search_path = public;

alter function public.sabbaths_set_country_id_from_group()
set search_path = public;

alter function public.set_updated_at()
set search_path = public;

alter function public.update_event_attendee_count()
set search_path = public;

alter function public.update_group_member_count()
set search_path = public;

alter function public.update_notification_user_states_updated_at()
set search_path = public;

alter function public.update_updated_at_column()
set search_path = public;


-- =========================================================
-- 5. SECURE FUTURE FUNCTION DEFAULTS
-- =========================================================

alter default privileges
for role postgres
in schema public
revoke execute on functions from public;

commit;
