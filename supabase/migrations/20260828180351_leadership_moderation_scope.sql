-- Give church leaders a local moderation queue without exposing reports from
-- other congregations. Administrators retain full access across the project.
-- Only the review fields are writable by clients; report details and church
-- scope cannot be changed from the app.

drop policy if exists content_reports_select_reporter_or_admin on public.content_reports;
create policy content_reports_select_reporter_or_responsible_leadership
on public.content_reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or public.is_app_admin()
  or (
    group_id is not null
    and exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = (select auth.uid())
        and reviewer.role = 'church_leader'
        and (
          reviewer.home_group_id = content_reports.group_id
          or exists (
            select 1
            from public.group_pastors assignment
            where assignment.user_id = reviewer.id
              and assignment.group_id = content_reports.group_id
          )
        )
    )
  )
);

drop policy if exists content_reports_update_admin on public.content_reports;
create policy content_reports_update_responsible_leadership
on public.content_reports
for update
to authenticated
using (
  public.is_app_admin()
  or (
    group_id is not null
    and exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = (select auth.uid())
        and reviewer.role = 'church_leader'
        and (
          reviewer.home_group_id = content_reports.group_id
          or exists (
            select 1
            from public.group_pastors assignment
            where assignment.user_id = reviewer.id
              and assignment.group_id = content_reports.group_id
          )
        )
    )
  )
)
with check (
  status in ('dismissed', 'action_taken')
  and reviewed_by = (select auth.uid())
  and reviewed_at is not null
  and (
    public.is_app_admin()
    or (
      group_id is not null
      and exists (
        select 1
        from public.profiles reviewer
        where reviewer.id = (select auth.uid())
          and reviewer.role = 'church_leader'
          and (
            reviewer.home_group_id = content_reports.group_id
            or exists (
              select 1
              from public.group_pastors assignment
              where assignment.user_id = reviewer.id
                and assignment.group_id = content_reports.group_id
            )
          )
      )
    )
  )
);

revoke update on table public.content_reports from authenticated;
grant update (status, reviewed_by, reviewed_at)
on table public.content_reports
to authenticated;
