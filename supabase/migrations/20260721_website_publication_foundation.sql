begin;

-- =========================================================
-- 1. PRIVATE HELPER SCHEMA
-- =========================================================

create schema if not exists website_private;

revoke all on schema website_private from public;
grant usage on schema website_private to authenticated;


-- =========================================================
-- 2. CHECK WHETHER A USER MAY MANAGE A GROUP
-- =========================================================

create or replace function website_private.can_manage_group(
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
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'admin'
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'church_leader'
          and p.home_group_id = target_group_id
      )
      or exists (
        select 1
        from public.group_pastors gp
        where gp.user_id = (select auth.uid())
          and gp.group_id = target_group_id
      )
    );
$$;

revoke all
on function website_private.can_manage_group(uuid)
from public;

grant execute
on function website_private.can_manage_group(uuid)
to authenticated;


-- =========================================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- =========================================================

create or replace function website_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all
on function website_private.set_updated_at()
from public;


-- =========================================================
-- 4. PUBLIC CHURCH PROFILES
-- =========================================================

create table if not exists public.website_churches (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null unique
    references public.groups(id)
    on delete cascade,

  slug text not null unique,
  display_name text not null,

  venue_name text,
  venue_note text,

  address_line text not null,
  postal_code text not null,
  city text not null,
  country_code text not null default 'CH',

  languages text[] not null default array['de']::text[],

  meeting_information text,
  summary text,
  contact_email text,
  map_url text,
  image_url text,

  sort_order integer not null default 0,
  is_active boolean not null default false,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint website_churches_slug_not_empty
    check (char_length(trim(slug)) >= 2),

  constraint website_churches_country_code_length
    check (char_length(country_code) = 2)
);

comment on table public.website_churches is
  'Sanitized congregation information approved for the public website.';


-- =========================================================
-- 5. PUBLIC EVENT PUBLICATIONS
-- =========================================================

create table if not exists public.website_events (
  id uuid primary key default gen_random_uuid(),

  source_event_id uuid not null
    references public.events(id)
    on delete cascade,

  group_id uuid not null
    references public.groups(id)
    on delete cascade,

  locale text not null default 'de',
  slug text not null,

  title text not null,
  description text,

  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,

  location text,
  event_type text,
  image_url text,

  registration_information text,

  is_active boolean not null default false,
  published_at timestamp with time zone,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint website_events_valid_locale
    check (locale in ('de', 'fr', 'en', 'es', 'pt', 'it')),

  constraint website_events_slug_not_empty
    check (char_length(trim(slug)) >= 2),

  constraint website_events_source_locale_unique
    unique (source_event_id, locale),

  constraint website_events_slug_locale_unique
    unique (locale, slug)
);

comment on table public.website_events is
  'Sanitized event snapshots explicitly approved for the public website.';


-- =========================================================
-- 6. PUBLIC PRAYER PUBLICATIONS
-- =========================================================

create table if not exists public.website_prayers (
  id uuid primary key default gen_random_uuid(),

  source_prayer_id uuid not null
    references public.prayers(id)
    on delete cascade,

  group_id uuid not null
    references public.groups(id)
    on delete cascade,

  locale text not null default 'de',

  title text not null,
  details text,

  category text,
  is_anonymous boolean not null default true,
  is_answered boolean not null default false,

  is_active boolean not null default false,
  published_at timestamp with time zone,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint website_prayers_valid_locale
    check (locale in ('de', 'fr', 'en', 'es', 'pt', 'it')),

  constraint website_prayers_source_locale_unique
    unique (source_prayer_id, locale)
);

comment on table public.website_prayers is
  'Sanitized prayer text explicitly approved for public display. No member IDs or requester names are exposed.';


-- =========================================================
-- 7. INDEXES
-- =========================================================

create index if not exists website_churches_active_sort_idx
  on public.website_churches (is_active, sort_order);

create index if not exists website_events_active_date_idx
  on public.website_events (is_active, starts_at);

create index if not exists website_events_group_idx
  on public.website_events (group_id);

create index if not exists website_prayers_active_date_idx
  on public.website_prayers (is_active, published_at desc);

create index if not exists website_prayers_group_idx
  on public.website_prayers (group_id);


-- =========================================================
-- 8. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists website_churches_updated_at
on public.website_churches;

create trigger website_churches_updated_at
before update on public.website_churches
for each row
execute function website_private.set_updated_at();


drop trigger if exists website_events_updated_at
on public.website_events;

create trigger website_events_updated_at
before update on public.website_events
for each row
execute function website_private.set_updated_at();


drop trigger if exists website_prayers_updated_at
on public.website_prayers;

create trigger website_prayers_updated_at
before update on public.website_prayers
for each row
execute function website_private.set_updated_at();


-- =========================================================
-- 9. ENABLE RLS
-- =========================================================

alter table public.website_churches enable row level security;
alter table public.website_events enable row level security;
alter table public.website_prayers enable row level security;


-- =========================================================
-- 10. EXPLICIT TABLE PRIVILEGES
-- =========================================================

revoke all
on table public.website_churches
from anon, authenticated;

revoke all
on table public.website_events
from anon, authenticated;

revoke all
on table public.website_prayers
from anon, authenticated;


grant select
on table public.website_churches
to anon, authenticated;

grant select
on table public.website_events
to anon, authenticated;

grant select
on table public.website_prayers
to anon, authenticated;


grant insert, update, delete
on table public.website_churches
to authenticated;

grant insert, update, delete
on table public.website_events
to authenticated;

grant insert, update, delete
on table public.website_prayers
to authenticated;


-- =========================================================
-- 11. WEBSITE CHURCH POLICIES
-- =========================================================

drop policy if exists "Website churches public read"
on public.website_churches;

create policy "Website churches public read"
on public.website_churches
for select
to anon
using (is_active = true);


drop policy if exists "Website churches authenticated read"
on public.website_churches;

create policy "Website churches authenticated read"
on public.website_churches
for select
to authenticated
using (
  is_active = true
  or website_private.can_manage_group(group_id)
);


drop policy if exists "Website churches managers write"
on public.website_churches;

create policy "Website churches managers write"
on public.website_churches
for all
to authenticated
using (
  website_private.can_manage_group(group_id)
)
with check (
  website_private.can_manage_group(group_id)
);


-- =========================================================
-- 12. WEBSITE EVENT POLICIES
-- =========================================================

drop policy if exists "Website events public read"
on public.website_events;

create policy "Website events public read"
on public.website_events
for select
to anon
using (is_active = true);


drop policy if exists "Website events authenticated read"
on public.website_events;

create policy "Website events authenticated read"
on public.website_events
for select
to authenticated
using (
  is_active = true
  or website_private.can_manage_group(group_id)
);


drop policy if exists "Website events managers write"
on public.website_events;

create policy "Website events managers write"
on public.website_events
for all
to authenticated
using (
  website_private.can_manage_group(group_id)
)
with check (
  website_private.can_manage_group(group_id)
);


-- =========================================================
-- 13. WEBSITE PRAYER POLICIES
-- =========================================================

drop policy if exists "Website prayers public read"
on public.website_prayers;

create policy "Website prayers public read"
on public.website_prayers
for select
to anon
using (is_active = true);


drop policy if exists "Website prayers authenticated read"
on public.website_prayers;

create policy "Website prayers authenticated read"
on public.website_prayers
for select
to authenticated
using (
  is_active = true
  or website_private.can_manage_group(group_id)
);


drop policy if exists "Website prayers managers write"
on public.website_prayers;

create policy "Website prayers managers write"
on public.website_prayers
for all
to authenticated
using (
  website_private.can_manage_group(group_id)
)
with check (
  website_private.can_manage_group(group_id)
);


-- =========================================================
-- 14. REMOVE UNINTENDED ANONYMOUS ACCESS
-- =========================================================

-- Authenticated app users can still read events through the existing
-- events_select_all policy. This removes only anonymous shared access.

drop policy if exists "View events scoped to church or shared"
on public.events;


-- Authenticated app users can still read prayers through the existing
-- prayers_select_all policy. This removes only anonymous shared access.

drop policy if exists "View prayers scoped to church or shared"
on public.prayers;


-- Prayer participation records must not be readable anonymously.

drop policy if exists "prayer_prayers_select"
on public.prayer_prayers;

create policy "prayer_prayers_select_authenticated"
on public.prayer_prayers
for select
to authenticated
using (true);


-- =========================================================
-- 15. ADD THE THREE APPROVED SWISS CONGREGATIONS
-- =========================================================

insert into public.website_churches (
  group_id,
  slug,
  display_name,
  venue_name,
  venue_note,
  address_line,
  postal_code,
  city,
  country_code,
  languages,
  sort_order,
  is_active
)
values
  (
    'e061159d-0ec6-4f4c-bb03-0f18de62f2d9',
    'zuerich',
    'Gemeinde Zürich',
    null,
    'Gemieteter Raum',
    'Langfurrenstrasse 62',
    '8105',
    'Regensdorf',
    'CH',
    array['de']::text[],
    10,
    true
  ),
  (
    '8ce33c0e-8567-4db0-a162-998e27d3f7f6',
    'bern',
    'Gemeinde Bern',
    'Kirche Oberbottigen',
    'Gemieteter Raum',
    'Oberbottigenweg 35',
    '3019',
    'Bern',
    'CH',
    array['de']::text[],
    20,
    true
  ),
  (
    '8d586810-721e-4305-b279-dc48cbab7a37',
    'geneve',
    'Gemeinde Genève',
    null,
    'Gemieteter Raum',
    'Chemin du Clos 20',
    '1212',
    'Grand-Lancy',
    'CH',
    array['fr']::text[],
    30,
    true
  )
on conflict (group_id)
do update set
  slug = excluded.slug,
  display_name = excluded.display_name,
  venue_name = excluded.venue_name,
  venue_note = excluded.venue_note,
  address_line = excluded.address_line,
  postal_code = excluded.postal_code,
  city = excluded.city,
  country_code = excluded.country_code,
  languages = excluded.languages,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

commit;