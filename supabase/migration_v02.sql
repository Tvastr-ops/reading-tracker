-- Migration v2: soft-delete, covers, yearly goal, reading log.
-- Run this once in the Supabase SQL editor. Safe to run on your existing
-- `books` table — it only adds new nullable columns and new tables.

-- Soft delete + cover image URL
alter table books add column if not exists deleted_at timestamptz;
alter table books add column if not exists cover_url text;

create index if not exists books_deleted_idx on books (deleted_at);

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
  to_progress numeric not null,
  note text,
  logged_at timestamptz not null default now()
);
alter table reading_log enable row level security;

create index if not exists reading_log_book_idx on reading_log (book_id, logged_at desc);
