-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Novel',
  author text,
  status text not null default 'Plan to Read',
  rating numeric(2,1),                -- 0.0 - 5.0, in .5 steps, nullable
  progress numeric default 0,         -- units read
  total_units numeric,                -- total units (chapters/pages/etc), nullable if unknown
  unit_type text not null default 'pages',
  progress_structure text not null default 'single',
  parent_progress numeric,
  parent_total numeric,
  latest_units numeric,
  is_ongoing boolean not null default false,
  genre_tags text,
  source_link text,
  cover_url text,                     -- optional cover image URL (fetched from Open Library)
  reading_pace numeric,               -- denormalized units/week for Reading status
  date_started date,
  date_finished date,
  notes text,
  is_favorite boolean not null default false,
  deleted_at timestamptz,             -- soft delete; null = active
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_status_idx on books (status);
create index if not exists books_updated_idx on books (updated_at desc);
create index if not exists books_deleted_idx on books (deleted_at);
create index if not exists books_active_updated_idx on books (updated_at desc) where deleted_at is null;
create index if not exists books_unit_type_idx on books (unit_type);
create index if not exists books_favorite_idx on books (is_favorite) where is_favorite = true and deleted_at is null;

alter table books drop constraint if exists chk_books_rating;
alter table books add constraint chk_books_rating check (rating is null or (rating >= 0.5 and rating <= 5.0));

alter table books drop constraint if exists chk_books_progress;
alter table books add constraint chk_books_progress check (progress is null or progress >= 0);

alter table books drop constraint if exists chk_books_unit_type;
alter table books add constraint chk_books_unit_type check (unit_type in ('pages', 'chapters', 'words', 'percent', 'volumes', 'units'));

alter table books drop constraint if exists chk_books_progress_structure;
alter table books add constraint chk_books_progress_structure check (progress_structure in ('single', 'volume_chapter', 'part_chapter'));

alter table books drop constraint if exists chk_total_units;
alter table books add constraint chk_total_units check (total_units is null or total_units >= 0);

alter table books drop constraint if exists chk_parent_progress;
alter table books add constraint chk_parent_progress check (parent_progress is null or parent_progress >= 0);

alter table books drop constraint if exists chk_parent_total;
alter table books add constraint chk_parent_total check (parent_total is null or parent_total >= 0);

alter table books drop constraint if exists chk_latest_units;
alter table books add constraint chk_latest_units check (latest_units is null or latest_units >= 0);

-- App-wide settings (single row per key). Used for the yearly reading goal.
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

-- Per-book reading log: timestamped progress entries, richer than the
-- single `progress` number on the book itself.
create table if not exists reading_log (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  from_progress numeric,
  to_progress numeric not null check (to_progress >= 0),
  note text,
  logged_at timestamptz not null default now()
);
alter table reading_log enable row level security;

create index if not exists reading_log_book_idx on reading_log (book_id, logged_at desc);

-- Row Level Security: enabled with single-user permissive policies for anon key client sync.
alter table books enable row level security;

drop policy if exists "Allow anon access on books" on books;
create policy "Allow anon access on books" on books for all to anon using (true) with check (true);

drop policy if exists "Allow anon access on reading_log" on reading_log;
create policy "Allow anon access on reading_log" on reading_log for all to anon using (true) with check (true);

drop policy if exists "Allow anon access on app_settings" on app_settings;
create policy "Allow anon access on app_settings" on app_settings for all to anon using (true) with check (true);

-- keep updated_at fresh automatically (Migration v11: smart favorite & explicit timestamp preservation)
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

drop trigger if exists books_updated_at on books;
create trigger books_updated_at
  before update on books
  for each row execute function set_updated_at();

-- Migration v9 RPC: atomic progress update, log insertion, and pace recalculation
create or replace function public.record_progress(
  p_book_id uuid,
  p_to_progress numeric,
  p_note text default null,
  p_create_log boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_progress numeric;
  v_entry_id uuid := null;
  v_pace numeric := null;
  v_oldest record;
  v_newest record;
  v_delta_progress numeric;
  v_delta_days numeric;
begin
  -- 1. Acquire row lock and read authoritative current progress
  select progress into v_current_progress
  from public.books
  where id = p_book_id
  for update;

  if not found then
    raise exception 'Book not found: %', p_book_id;
  end if;

  -- 2. Update book progress
  update public.books
  set progress = p_to_progress
  where id = p_book_id;

  -- 3. Only insert reading log on positive advancement if requested
  if p_create_log and (v_current_progress is null or p_to_progress > v_current_progress) then
    insert into public.reading_log (book_id, from_progress, to_progress, note)
    values (p_book_id, coalesce(v_current_progress, 0), p_to_progress, p_note)
    returning id into v_entry_id;
  end if;

  -- 4. Recalculate pace from full log history if any logs exist
  select to_progress, logged_at into v_oldest
  from public.reading_log
  where book_id = p_book_id
  order by logged_at asc
  limit 1;

  select to_progress, logged_at into v_newest
  from public.reading_log
  where book_id = p_book_id
  order by logged_at desc
  limit 1;

  if v_oldest is not null and v_newest is not null and v_oldest.logged_at != v_newest.logged_at then
    v_delta_progress := v_newest.to_progress - v_oldest.to_progress;
    v_delta_days := greatest(1, extract(epoch from (v_newest.logged_at - v_oldest.logged_at)) / 86400.0);
    if v_delta_progress > 0 then
      v_pace := round((v_delta_progress / v_delta_days) * 7.0, 1);
    end if;
  end if;

  update public.books
  set reading_pace = v_pace
  where id = p_book_id;

  -- 5. Return structured result
  return jsonb_build_object(
    'entry_id', v_entry_id,
    'from_progress', coalesce(v_current_progress, 0),
    'to_progress', p_to_progress,
    'pace', v_pace
  );
end;
$$;

grant execute on function public.record_progress(uuid, numeric, text, boolean) to anon, authenticated, service_role;
