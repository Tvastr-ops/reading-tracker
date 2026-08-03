-- Migration v4: Partial composite index & database check constraints.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

-- Partial composite index for fast active book listing query
create index if not exists books_active_updated_idx on books (updated_at desc) where deleted_at is null;

-- Data integrity check constraints
alter table books drop constraint if exists chk_books_rating;
alter table books add constraint chk_books_rating check (rating is null or (rating >= 0.0 and rating <= 5.0));

alter table books drop constraint if exists chk_books_progress;
alter table books add constraint chk_books_progress check (progress is null or progress >= 0);

alter table reading_log drop constraint if exists chk_log_progress;
alter table reading_log add constraint chk_log_progress check (to_progress >= 0);
