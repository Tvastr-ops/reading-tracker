-- ==========================================================
-- Migration v13: Reading Journeys (Multi-Read History & Re-reads)
-- ==========================================================

-- 1. Create reading_journeys table
CREATE TABLE IF NOT EXISTS reading_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  journey_index INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'completed', 'abandoned', 'on_hold')),
  date_started TIMESTAMPTZ NOT NULL,
  date_finished TIMESTAMPTZ,
  rating NUMERIC(3, 1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_reading_journeys_user_book ON reading_journeys(user_id, book_id, journey_index DESC);
CREATE INDEX IF NOT EXISTS idx_reading_journeys_updated_at ON reading_journeys(updated_at DESC);

-- 3. Enable RLS
ALTER TABLE reading_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading journeys"
  ON reading_journeys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading journeys"
  ON reading_journeys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading journeys"
  ON reading_journeys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading journeys"
  ON reading_journeys FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Add journey_id to reading_log table
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES reading_journeys(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reading_log_journey_id ON reading_log(journey_id);

-- 5. Backfill Journey #1 for existing books
INSERT INTO reading_journeys (id, user_id, book_id, journey_index, status, date_started, date_finished, rating, created_at, updated_at)
SELECT
  gen_random_uuid(),
  b.user_id,
  b.id,
  1,
  CASE WHEN b.status = 'Completed' THEN 'completed' ELSE 'reading' END,
  COALESCE(b.date_started, b.created_at, now()),
  b.date_finished,
  b.rating,
  b.created_at,
  b.updated_at
FROM books b
WHERE b.deleted_at IS NULL
  AND (b.date_started IS NOT NULL OR b.date_finished IS NOT NULL OR b.status = 'Completed' OR b.status = 'Reading')
ON CONFLICT (id) DO NOTHING;
