-- Migration v11: Comprehensive smart updated_at trigger
-- 1. Preserves shelf position when ONLY the is_favorite flag is toggled.
-- 2. Respects explicitly provided historical timestamps.
-- 3. Automatically updates timestamp to NOW() for any reading progress or content edits.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- 1. If ONLY is_favorite was toggled and all other content fields remain unchanged, preserve existing updated_at
  if new.is_favorite is distinct from old.is_favorite and
     new.title = old.title and
     new.progress is not distinct from old.progress and
     new.status = old.status and
     new.total_units is not distinct from old.total_units and
     new.rating is not distinct from old.rating and
     new.author is not distinct from old.author and
     new.notes is not distinct from old.notes and
     new.genre_tags is not distinct from old.genre_tags and
     new.cover_url is not distinct from old.cover_url and
     new.source_link is not distinct from old.source_link and
     new.date_started is not distinct from old.date_started and
     new.date_finished is not distinct from old.date_finished and
     new.parent_progress is not distinct from old.parent_progress and
     new.parent_total is not distinct from old.parent_total and
     new.latest_units is not distinct from old.latest_units and
     new.is_ongoing is not distinct from old.is_ongoing and
     new.progress_structure is not distinct from old.progress_structure and
     new.unit_type is not distinct from old.unit_type and
     new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;

  -- 2. If caller explicitly passed a custom/historical updated_at, respect it
  if new.updated_at is distinct from old.updated_at and new.updated_at is not null then
    return new;
  end if;

  -- 3. Otherwise, for standard content edits & reading advancements, update timestamp to current time
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
