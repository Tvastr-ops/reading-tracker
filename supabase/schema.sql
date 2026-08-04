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
  genre_tags text,
  source_link text,
  cover_url text,                     -- optional cover image URL (fetched from Open Library)
  reading_pace numeric,               -- denormalized units/week for Reading status
  date_started date,
  date_finished date,
  notes text,
  deleted_at timestamptz,             -- soft delete; null = active
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_status_idx on books (status);
create index if not exists books_updated_idx on books (updated_at desc);
create index if not exists books_deleted_idx on books (deleted_at);
create index if not exists books_active_updated_idx on books (updated_at desc) where deleted_at is null;

alter table books drop constraint if exists chk_books_rating;
alter table books add constraint chk_books_rating check (rating is null or (rating >= 0.0 and rating <= 5.0));

alter table books drop constraint if exists chk_books_progress;
alter table books add constraint chk_books_progress check (progress is null or progress >= 0);

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

-- Row Level Security: locked down entirely. The app never uses the public
-- anon key, only the service_role key from the server, which bypasses RLS.
-- This means even if your anon key leaked, nobody could read/write data.
alter table books enable row level security;

-- keep updated_at fresh automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists books_updated_at on books;
create trigger books_updated_at
  before update on books
  for each row execute function set_updated_at();
