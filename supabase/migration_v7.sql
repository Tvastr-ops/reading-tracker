-- Migration v7: Clean up 0.0 ratings to NULL (unrated)
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).

update books set rating = null where rating = 0;

-- Also update check constraint to ensure ratings must be > 0 (minimum 0.5) if not null
alter table books drop constraint if exists chk_books_rating;
alter table books add constraint chk_books_rating check (rating is null or (rating >= 0.5 and rating <= 5.0));
