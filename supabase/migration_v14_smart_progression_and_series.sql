-- ==========================================================
-- Migration v14: Smart Progression, Series Aggregation & Contextual Sessions
-- ==========================================================

-- 1. Add contextual session columns to reading_log
ALTER TABLE public.reading_log 
  ADD COLUMN IF NOT EXISTS parent_progress NUMERIC,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- 2. Add full-text search vector and GIN index on books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', 
    coalesce(title, '') || ' ' || 
    coalesce(author, '') || ' ' || 
    coalesce(series_name, '') || ' ' || 
    coalesce(genre_tags, '')
  )
) STORED;

CREATE INDEX IF NOT EXISTS idx_books_search_vector ON public.books USING gin(search_vector);

-- 3. Create high-performance series aggregation view
CREATE OR REPLACE VIEW public.v_series_overview AS
SELECT
  b.series_name,
  count(b.id) AS total_books,
  count(b.id) FILTER (WHERE b.status = 'Completed') AS completed_books,
  count(b.id) FILTER (WHERE b.status = 'Reading') AS reading_books,
  sum(coalesce(b.progress, 0)) AS total_units_read,
  sum(coalesce(b.total_units, 0)) AS total_series_units,
  round(
    (sum(coalesce(b.progress, 0)) / nullif(sum(coalesce(b.total_units, 0)), 0)) * 100,
    1
  ) AS series_progress_pct,
  (
    SELECT id FROM public.books b2 
    WHERE b2.series_name = b.series_name AND b2.status = 'Reading' AND b2.deleted_at IS NULL 
    ORDER BY b2.series_order ASC NULLS LAST LIMIT 1
  ) AS active_book_id,
  min(b.cover_url) FILTER (WHERE b.cover_url IS NOT NULL) AS series_cover_url,
  max(b.updated_at) AS last_read_at
FROM public.books b
WHERE b.series_name IS NOT NULL 
  AND b.series_name <> '' 
  AND b.deleted_at IS NULL
GROUP BY b.series_name;

GRANT SELECT ON public.v_series_overview TO anon, authenticated, service_role;

-- 4. Upgrade record_progress into a smart session & lifecycle RPC
CREATE OR REPLACE FUNCTION public.record_progress(
  p_book_id uuid,
  p_to_progress numeric,
  p_note text default null,
  p_create_log boolean default true,
  p_to_parent_progress numeric default null,
  p_duration_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book record;
  v_entry_id uuid := null;
  v_pace numeric := null;
  v_oldest record;
  v_newest record;
  v_delta_progress numeric;
  v_delta_days numeric;
  v_active_journey_id uuid := null;
  v_new_status text;
  v_new_date_started date;
  v_new_date_finished date;
begin
  -- 1. Acquire row lock and read authoritative current book state
  select * into v_book
  from public.books
  where id = p_book_id
  for update;

  if not found then
    raise exception 'Book not found: %', p_book_id;
  end if;

  v_new_status := v_book.status;
  v_new_date_started := v_book.date_started;
  v_new_date_finished := v_book.date_finished;

  -- 2. Lifecycle state transitions
  if v_book.status = 'Plan to Read' and (p_to_progress > 0 or coalesce(p_to_parent_progress, 0) > 0) then
    v_new_status := 'Reading';
    v_new_date_started := coalesce(v_new_date_started, current_date);
  end if;

  -- Auto-transition to Completed if reaching total units
  if (v_book.total_units is not null and p_to_progress >= v_book.total_units) or
     (v_book.parent_total is not null and p_to_parent_progress is not null and p_to_parent_progress >= v_book.parent_total) then
    v_new_status := 'Completed';
    v_new_date_finished := coalesce(v_new_date_finished, current_date);
  end if;

  -- 3. Update book record
  update public.books
  set 
    progress = p_to_progress,
    parent_progress = coalesce(p_to_parent_progress, parent_progress),
    status = v_new_status,
    date_started = v_new_date_started,
    date_finished = v_new_date_finished
  where id = p_book_id;

  -- 4. Find active reading journey if any
  select id into v_active_journey_id
  from public.reading_journeys
  where book_id = p_book_id and status = 'reading'
  order by journey_index desc
  limit 1;

  -- 5. Insert reading log on positive advancement if requested
  if p_create_log and (
    v_book.progress is null or 
    p_to_progress > v_book.progress or 
    (p_to_parent_progress is not null and p_to_parent_progress > coalesce(v_book.parent_progress, 0))
  ) then
    insert into public.reading_log (
      book_id, 
      journey_id, 
      from_progress, 
      to_progress, 
      parent_progress, 
      duration_seconds, 
      note
    )
    values (
      p_book_id, 
      v_active_journey_id, 
      coalesce(v_book.progress, 0), 
      p_to_progress, 
      p_to_parent_progress, 
      p_duration_seconds, 
      p_note
    )
    returning id into v_entry_id;
  end if;

  -- 6. Recalculate pace from recent logs (last 30-day sliding window)
  select to_progress, logged_at into v_oldest
  from public.reading_log
  where book_id = p_book_id and logged_at >= (pg_catalog.now() - interval '30 days')
  order by logged_at asc
  limit 1;

  select to_progress, logged_at into v_newest
  from public.reading_log
  where book_id = p_book_id
  order by logged_at desc
  limit 1;

  if v_oldest is not null and v_newest is not null and v_oldest.logged_at != v_newest.logged_at then
    v_delta_progress := v_newest.to_progress - v_oldest.to_progress;
    v_delta_days := greatest(1, extract(epoch from (v_newest.logged_at - v_oldest.logged_at)) / 86400.0);
    if v_delta_progress > 0 then
      v_pace := round((v_delta_progress / v_delta_days) * 7.0, 1);
    end if;
  end if;

  update public.books
  set reading_pace = v_pace
  where id = p_book_id;

  -- 7. Return structured result
  return jsonb_build_object(
    'entry_id', v_entry_id,
    'from_progress', coalesce(v_book.progress, 0),
    'to_progress', p_to_progress,
    'parent_progress', coalesce(p_to_parent_progress, v_book.parent_progress),
    'status', v_new_status,
    'pace', v_pace
  );
end;
$$;

grant execute on function public.record_progress(uuid, numeric, text, boolean, numeric, integer) to anon, authenticated, service_role;

-- 5. Atomic Reread Lifecycle RPC
CREATE OR REPLACE FUNCTION public.start_reread(p_book_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next_journey_index integer;
  v_new_journey_id uuid;
BEGIN
  -- 1. Mark existing active journeys as completed if unfinished
  UPDATE public.reading_journeys
  SET status = 'completed', date_finished = COALESCE(date_finished, pg_catalog.now())
  WHERE book_id = p_book_id AND status = 'reading';

  -- 2. Determine next journey index
  SELECT COALESCE(MAX(journey_index), 0) + 1 INTO v_next_journey_index
  FROM public.reading_journeys
  WHERE book_id = p_book_id;

  -- 3. Insert new reading journey
  INSERT INTO public.reading_journeys (book_id, journey_index, status, date_started)
  VALUES (p_book_id, v_next_journey_index, 'reading', pg_catalog.now())
  RETURNING id INTO v_new_journey_id;

  -- 4. Reset book progression and increment reread_count
  UPDATE public.books
  SET 
    status = 'Reading',
    progress = 0,
    parent_progress = CASE WHEN progress_structure IN ('volume_chapter', 'part_chapter') THEN 0 ELSE parent_progress END,
    reread_count = reread_count + 1,
    date_started = CURRENT_DATE,
    date_finished = NULL,
    updated_at = pg_catalog.now()
  WHERE id = p_book_id;

  RETURN jsonb_build_object(
    'journey_id', v_new_journey_id,
    'journey_index', v_next_journey_index
  );
END;
$$;

grant execute on function public.start_reread(uuid) to anon, authenticated, service_role;
