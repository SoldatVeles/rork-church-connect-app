begin;

-- =========================================================
-- 1. PRIVATE REVIEW AUTHORIZATION
-- =========================================================

create or replace function website_private.can_review_website_prayer_submission(
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
    and exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = (select auth.uid())
        and coalesce(reviewer.is_blocked, false) = false
        and (
          reviewer.role = 'admin'
          or (
            reviewer.role = 'church_leader'
            and reviewer.home_group_id = target_group_id
          )
          or (
            reviewer.role in ('pastor', 'church_leader')
            and exists (
              select 1
              from public.group_pastors assignment
              where assignment.user_id = reviewer.id
                and assignment.group_id = target_group_id
            )
          )
        )
    );
$$;

revoke all
on function website_private.can_review_website_prayer_submission(uuid)
from public, anon, authenticated;

grant execute
on function website_private.can_review_website_prayer_submission(uuid)
to authenticated;


-- =========================================================
-- 2. PRIVATE WEBSITE PRAYER INTAKE
-- =========================================================

create table public.website_prayer_submissions (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null
    constraint website_prayer_submissions_group_id_fkey
    references public.groups(id)
    on delete restrict,

  locale text not null default 'de',
  requester_name text,
  requester_email text,
  title text not null,
  details text not null,
  sharing_preference text not null,
  privacy_consent boolean not null,

  status text not null default 'pending',
  reviewed_by uuid
    references public.profiles(id)
    on delete set null,
  reviewed_at timestamp with time zone,
  accepted_prayer_id uuid
    references public.prayers(id)
    on delete set null,

  request_fingerprint text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint website_prayer_submissions_locale_check
    check (locale in ('de', 'fr', 'en', 'es', 'pt', 'it')),

  constraint website_prayer_submissions_name_length
    check (
      requester_name is null
      or char_length(requester_name) between 1 and 120
    ),

  constraint website_prayer_submissions_email_length
    check (
      requester_email is null
      or char_length(requester_email) between 3 and 254
    ),

  constraint website_prayer_submissions_title_length
    check (char_length(title) between 5 and 120),

  constraint website_prayer_submissions_details_length
    check (char_length(details) between 10 and 4000),

  constraint website_prayer_submissions_sharing_check
    check (
      sharing_preference in (
        'leaders_only',
        'church_anonymous',
        'contact_first'
      )
    ),

  constraint website_prayer_submissions_contact_email_check
    check (
      sharing_preference <> 'contact_first'
      or requester_email is not null
    ),

  constraint website_prayer_submissions_consent_check
    check (privacy_consent = true),

  constraint website_prayer_submissions_status_check
    check (status in ('pending', 'accepted', 'handled', 'rejected')),

  constraint website_prayer_submissions_fingerprint_length
    check (char_length(request_fingerprint) = 64)
);

comment on table public.website_prayer_submissions is
  'Private intake for prayer requests submitted through the public website. Anonymous visitors can neither read nor write this table directly.';

comment on column public.website_prayer_submissions.request_fingerprint is
  'Daily salted SHA-256 fingerprint created by the Edge Function for abuse prevention. No raw IP address is stored.';

create index website_prayer_submissions_review_queue_idx
  on public.website_prayer_submissions (status, group_id, created_at);

create index website_prayer_submissions_rate_limit_idx
  on public.website_prayer_submissions (request_fingerprint, created_at desc);

create trigger website_prayer_submissions_updated_at
before update on public.website_prayer_submissions
for each row
execute function website_private.set_updated_at();

alter table public.website_prayer_submissions enable row level security;

revoke all
on table public.website_prayer_submissions
from public, anon, authenticated;

grant select
on table public.website_prayer_submissions
to authenticated;

create policy "Website prayer submissions reviewers read"
on public.website_prayer_submissions
for select
to authenticated
using (
  website_private.can_review_website_prayer_submission(group_id)
);


-- =========================================================
-- 3. AUTHORIZED REVIEW ACTION
-- =========================================================

create or replace function public.review_website_prayer_submission(
  p_submission_id uuid,
  p_action text,
  p_title text default null,
  p_details text default null
)
returns table (
  submission_status text,
  prayer_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.website_prayer_submissions%rowtype;
  normalized_title text;
  normalized_details text;
  created_prayer_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into submission
  from public.website_prayer_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Prayer submission not found'
      using errcode = 'P0002';
  end if;

  if not website_private.can_review_website_prayer_submission(
    submission.group_id
  ) then
    raise exception 'Not authorized to review this prayer submission'
      using errcode = '42501';
  end if;

  if submission.status <> 'pending' then
    raise exception 'Prayer submission has already been reviewed'
      using errcode = '23514';
  end if;

  if p_action = 'accept' then
    if submission.sharing_preference <> 'church_anonymous' then
      raise exception 'The requester did not authorize sharing with the congregation'
        using errcode = '42501';
    end if;

    normalized_title := trim(coalesce(p_title, submission.title));
    normalized_details := trim(coalesce(p_details, submission.details));

    if char_length(normalized_title) not between 5 and 120 then
      raise exception 'Prayer title must contain between 5 and 120 characters'
        using errcode = '22023';
    end if;

    if char_length(normalized_details) not between 10 and 4000 then
      raise exception 'Prayer details must contain between 10 and 4000 characters'
        using errcode = '22023';
    end if;

    insert into public.prayers (
      title,
      details,
      description,
      visibility,
      group_id,
      is_answered,
      requested_by,
      requested_by_name,
      is_anonymous,
      is_urgent,
      status,
      category,
      created_by,
      is_shared_all_churches
    )
    values (
      normalized_title,
      normalized_details,
      normalized_details,
      'group',
      submission.group_id,
      false,
      null,
      null,
      true,
      false,
      'active',
      'other',
      (select auth.uid()),
      false
    )
    returning id into created_prayer_id;

    update public.website_prayer_submissions
    set
      status = 'accepted',
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      accepted_prayer_id = created_prayer_id
    where id = submission.id;

    insert into public.notifications (
      type,
      title,
      body,
      link_path,
      created_by,
      user_id,
      group_id,
      prayer_id,
      title_key,
      body_key,
      body_params
    )
    select
      'prayer',
      'New Prayer Request',
      'A new anonymous prayer request has been shared.',
      '/(tabs)/prayers',
      (select auth.uid()),
      recipient.user_id,
      submission.group_id,
      created_prayer_id,
      'notificationContent.prayers.newPrayerRequestTitle',
      'notificationContent.prayers.anonymousPrayerBody',
      '{}'::jsonb
    from public.get_church_notification_recipient_ids(
      submission.group_id,
      array[(select auth.uid())]::uuid[]
    ) recipient;

    return query
    select 'accepted'::text, created_prayer_id;
    return;
  end if;

  if p_action not in ('handled', 'rejected') then
    raise exception 'Unsupported review action'
      using errcode = '22023';
  end if;

  update public.website_prayer_submissions
  set
    status = p_action,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = submission.id;

  return query
  select p_action, null::uuid;
end;
$$;

revoke all
on function public.review_website_prayer_submission(uuid, text, text, text)
from public, anon, authenticated;

grant execute
on function public.review_website_prayer_submission(uuid, text, text, text)
to authenticated;

commit;
