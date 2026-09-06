-- ==========================================================
-- Migration v15: Add Dedicated Book Description / Synopsis Column
-- ==========================================================

-- 1. Add description column to public.books for plot summary/blurb
ALTER TABLE public.books 
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Update search_vector generated column to include description
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE public.books DROP COLUMN search_vector;
    
    ALTER TABLE public.books ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
      to_tsvector('english', 
        coalesce(title, '') || ' ' || 
        coalesce(author, '') || ' ' || 
        coalesce(series_name, '') || ' ' || 
        coalesce(genre_tags, '') || ' ' ||
        coalesce(description, '')
      )
    ) STORED;
    
    CREATE INDEX IF NOT EXISTS idx_books_search_vector ON public.books USING gin(search_vector);
  END IF;
END \$\$;