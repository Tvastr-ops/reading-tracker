-- Migration v12: Series & Sagas, Custom Shelves, and Re-reading tracking
-- Run this in your Supabase SQL editor (Project -> SQL Editor -> New query).

alter table public.books add column if not exists series_name text;
alter table public.books add column if not exists series_order numeric;
alter table public.books add column if not exists shelf_names text;
alter table public.books add column if not exists reread_count integer not null default 0;

create index if not exists books_series_idx on public.books (series_name, series_order);
