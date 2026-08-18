-- Migration v6: Add is_favorite column to books table
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).

alter table books add column if not exists is_favorite boolean not null default false;

-- Index for quick favorites filtering
create index if not exists books_favorite_idx on books (is_favorite) where is_favorite = true and deleted_at is null;
