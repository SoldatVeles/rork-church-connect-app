begin;

-- INSERT ... RETURNING must evaluate the SELECT policy before a stable helper
-- can look the new row up again in public.prayers. Evaluate the same visibility
-- conditions directly against the row so authenticated prayer creation can
-- return its newly generated id without weakening anonymous access.

drop policy if exists "prayers_select_authenticated_scoped"
on public.prayers;

create policy "prayers_select_authenticated_scoped"
on public.prayers
for select
to authenticated
using (
  created_by = (select auth.uid())
  or is_shared_all_churches = true
  or website_private.can_access_prayer_group(group_id)
);

-- Remove the redundant historical INSERT policy. The scoped authenticated
-- policy remains the only INSERT policy.

drop policy if exists "prayers_insert_self"
on public.prayers;

commit;
