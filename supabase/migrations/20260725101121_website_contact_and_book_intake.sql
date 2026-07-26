begin;

create or replace function website_private.can_review_website_contact_submission(
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
            target_group_id is not null
            and reviewer.role = 'church_leader'
            and reviewer.home_group_id = target_group_id
          )
          or (
            target_group_id is not null
            and reviewer.role in ('pastor', 'church_leader')
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
on function website_private.can_review_website_contact_submission(uuid)
from public, anon, authenticated;

grant execute
on function website_private.can_review_website_contact_submission(uuid)
to authenticated;

create table public.website_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null,
  group_id uuid
    constraint website_contact_submissions_group_id_fkey
    references public.groups(id)
    on delete restrict,
  locale text not null default 'de',
  requester_name text not null,
  requester_email text not null,
  postal_address text,
  topic text not null,
  message text,
  privacy_consent boolean not null,
  status text not null default 'pending',
  reviewed_by uuid
    references public.profiles(id)
    on delete set null,
  reviewed_at timestamp with time zone,
  request_fingerprint text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint website_contact_submissions_type_check
    check (submission_type in ('contact', 'book_request')),
  constraint website_contact_submissions_locale_check
    check (locale in ('de', 'fr', 'en', 'es', 'pt', 'it')),
  constraint website_contact_submissions_name_length
    check (char_length(requester_name) between 2 and 120),
  constraint website_contact_submissions_email_length
    check (char_length(requester_email) between 3 and 254),
  constraint website_contact_submissions_address_length
    check (
      postal_address is null
      or char_length(postal_address) between 5 and 500
    ),
  constraint website_contact_submissions_book_address_check
    check (
      submission_type <> 'book_request'
      or postal_address is not null
    ),
  constraint website_contact_submissions_topic_length
    check (char_length(topic) between 2 and 80),
  constraint website_contact_submissions_message_length
    check (
      message is null
      or char_length(message) between 2 and 4000
    ),
  constraint website_contact_submissions_contact_message_check
    check (
      submission_type <> 'contact'
      or (
        message is not null
        and char_length(message) >= 10
      )
    ),
  constraint website_contact_submissions_consent_check
    check (privacy_consent = true),
  constraint website_contact_submissions_status_check
    check (status in ('pending', 'handled', 'rejected')),
  constraint website_contact_submissions_fingerprint_length
    check (char_length(request_fingerprint) = 64)
);

comment on table public.website_contact_submissions is
  'Private intake for contact and free-book requests from the public website. Anonymous visitors cannot read or write this table directly.';

comment on column public.website_contact_submissions.request_fingerprint is
  'Daily salted SHA-256 fingerprint created by the Edge Function for abuse prevention. No raw IP address is stored.';

create index website_contact_submissions_review_queue_idx
  on public.website_contact_submissions (status, group_id, created_at);

create index website_contact_submissions_rate_limit_idx
  on public.website_contact_submissions (
    request_fingerprint,
    created_at desc
  );

create index website_contact_submissions_group_id_idx
  on public.website_contact_submissions (group_id);

create index website_contact_submissions_reviewed_by_idx
  on public.website_contact_submissions (reviewed_by);

create trigger website_contact_submissions_updated_at
before update on public.website_contact_submissions
for each row
execute function website_private.set_updated_at();

alter table public.website_contact_submissions enable row level security;

revoke all
on table public.website_contact_submissions
from public, anon, authenticated;

grant select
on table public.website_contact_submissions
to authenticated;

create policy "Website contact submissions reviewers read"
on public.website_contact_submissions
for select
to authenticated
using (
  website_private.can_review_website_contact_submission(group_id)
);

create or replace function public.review_website_contact_submission(
  p_submission_id uuid,
  p_action text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.website_contact_submissions%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into submission
  from public.website_contact_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Website request not found'
      using errcode = 'P0002';
  end if;

  if not website_private.can_review_website_contact_submission(
    submission.group_id
  ) then
    raise exception 'Not authorized to review this website request'
      using errcode = '42501';
  end if;

  if submission.status <> 'pending' then
    raise exception 'Website request has already been reviewed'
      using errcode = '23514';
  end if;

  if p_action not in ('handled', 'rejected') then
    raise exception 'Unsupported review action'
      using errcode = '22023';
  end if;

  update public.website_contact_submissions
  set
    status = p_action,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = submission.id;

  return p_action;
end;
$$;

revoke all
on function public.review_website_contact_submission(uuid, text)
from public, anon, authenticated;

grant execute
on function public.review_website_contact_submission(uuid, text)
to authenticated;

commit;
