-- Keep an already published, sanitized prayer copy aligned with the
-- authoritative prayer record when its answered state changes in the app.
create or replace function website_private.sync_prayer_publication_answered_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.website_prayers
  set is_answered = new.is_answered
  where source_prayer_id = new.id
    and is_answered is distinct from new.is_answered;

  return new;
end;
$$;

revoke all
on function website_private.sync_prayer_publication_answered_status()
from public, anon, authenticated;

drop trigger if exists sync_prayer_publication_answered_status
on public.prayers;

create trigger sync_prayer_publication_answered_status
after update of is_answered on public.prayers
for each row
when (old.is_answered is distinct from new.is_answered)
execute function website_private.sync_prayer_publication_answered_status();

-- Reconcile copies published before this trigger existed.
update public.website_prayers as website_prayer
set is_answered = prayer.is_answered
from public.prayers as prayer
where website_prayer.source_prayer_id = prayer.id
  and website_prayer.is_answered is distinct from prayer.is_answered;
