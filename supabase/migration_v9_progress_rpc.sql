-- Migration v9: Atomic record_progress RPC function
-- Ensures atomic progress update, conditional reading log insertion on advancement, and pace recalculation.

create or replace function public.record_progress(
  p_book_id uuid,
  p_to_progress numeric,
  p_note text default null,
  p_create_log boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_progress numeric;
  v_entry_id uuid := null;
  v_pace numeric := null;
  v_oldest record;
  v_newest record;
  v_delta_progress numeric;
  v_delta_days numeric;
begin
  -- 1. Acquire row lock and read authoritative current progress
  select progress into v_current_progress
  from public.books
  where id = p_book_id
  for update;

  if not found then
    raise exception 'Book not found: %', p_book_id;
  end if;

  -- 2. Update book progress
  update public.books
  set progress = p_to_progress
  where id = p_book_id;

  -- 3. Only insert reading log on positive advancement if requested (corrections change progress without logging)
  if p_create_log and (v_current_progress is null or p_to_progress > v_current_progress) then
    insert into public.reading_log (book_id, from_progress, to_progress, note)
    values (p_book_id, coalesce(v_current_progress, 0), p_to_progress, p_note)
    returning id into v_entry_id;
  end if;

  -- 4. Recalculate pace from full log history if any logs exist
  select to_progress, logged_at into v_oldest
  from public.reading_log
  where book_id = p_book_id
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

  -- 5. Return structured result
  return jsonb_build_object(
    'entry_id', v_entry_id,
    'from_progress', coalesce(v_current_progress, 0),
    'to_progress', p_to_progress,
    'pace', v_pace
  );
end;
$$;

-- Grant execution to anon and authenticated roles
grant execute on function public.record_progress(uuid, numeric, text, boolean) to anon, authenticated, service_role;
