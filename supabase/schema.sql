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
  date_started date,
  date_finished date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_status_idx on books (status);
create index if not exists books_updated_idx on books (updated_at desc);

-- Row Level Security: locked down entirely. The app never uses the public
-- anon key, only the service_role key from the server, which bypasses RLS.
-- This means even if your anon key leaked, nobody could read/write data.
alter table books enable row level security;

-- keep updated_at fresh automatically
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists books_updated_at on books;
create trigger books_updated_at
  before update on books
  for each row execute function set_updated_at();
