-- Migration v5: Evolutionary schema for flexible units, structures, and ongoing works
-- Run this once in the Supabase SQL editor. Safe to run on existing books table.

ALTER TABLE books ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'pages';
ALTER TABLE books ADD COLUMN IF NOT EXISTS progress_structure text NOT NULL DEFAULT 'single';
ALTER TABLE books ADD COLUMN IF NOT EXISTS parent_progress numeric DEFAULT NULL;
ALTER TABLE books ADD COLUMN IF NOT EXISTS parent_total numeric DEFAULT NULL;
ALTER TABLE books ADD COLUMN IF NOT EXISTS latest_units numeric DEFAULT NULL;
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_ongoing boolean NOT NULL DEFAULT false;

-- Data integrity check constraints
ALTER TABLE books DROP CONSTRAINT IF EXISTS chk_books_unit_type;
ALTER TABLE books ADD CONSTRAINT chk_books_unit_type 
  CHECK (unit_type IN ('pages', 'chapters', 'words', 'percent', 'units'));

ALTER TABLE books DROP CONSTRAINT IF EXISTS chk_books_progress_structure;
ALTER TABLE books ADD CONSTRAINT chk_books_progress_structure 
  CHECK (progress_structure IN ('single', 'volume_chapter', 'part_chapter'));

CREATE INDEX IF NOT EXISTS books_unit_type_idx ON books(unit_type);
