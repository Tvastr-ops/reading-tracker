import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import type { BookInput, BookStatus } from '@/lib/types';

import { validateProgressionFields } from '@/lib/validation';

// See app/api/export/route.ts for why this is required.
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const showTrash = url.searchParams.get('trash') === '1';
  const includeAll = url.searchParams.get('all') === '1' || url.searchParams.get('sync') === '1';
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 50;

  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search')?.trim();
  const favorite = url.searchParams.get('favorite') === '1';
  const sortField = url.searchParams.get('sortField') || 'updated_at';
  const sortDir = url.searchParams.get('sortDir') === 'asc';

  const supabase = supabaseServer();
  let query = supabase
    .from('books')
    .select(
      'id, title, type, unit_type, progress_structure, parent_progress, parent_total, latest_units, is_ongoing, author, status, rating, progress, total_units, genre_tags, source_link, cover_url, reading_pace, date_started, date_finished, notes, is_favorite, series_name, series_order, shelf_names, reread_count, deleted_at, created_at, updated_at',
      { count: 'exact' },
    );

  if (!includeAll) {
    query = showTrash ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  }

  const since = url.searchParams.get('since');
  if (since) {
    query = query.gt('updated_at', since);
  }

  if (status && status !== 'All') {
    query = query.eq('status', status as BookStatus);
  }

  if (favorite) {
    query = query.eq('is_favorite', true);
  }

  if (search) {
    // Strip PostgREST control characters to prevent filter syntax injection (F-03)
    const cleanSearch = search.replace(/[,().:%]/g, '').trim();
    if (cleanSearch) {
      query = query.or(
        `title.ilike.%${cleanSearch}%,author.ilike.%${cleanSearch}%,series_name.ilike.%${cleanSearch}%,genre_tags.ilike.%${cleanSearch}%,shelf_names.ilike.%${cleanSearch}%`,
      );
    }
  }

  // Safe sort field whitelist
  const allowedSortFields = [
    'updated_at',
    'created_at',
    'title',
    'rating',
    'date_finished',
    'status',
    'progress',
    'author',
  ];
  const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'updated_at';
  query = query.order(safeSortField, { ascending: sortDir });

  if (!includeAll && url.searchParams.has('page')) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json(
    {
      books: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
    {
      headers: {
        'Cache-Control': 'private, no-cache, must-revalidate',
      },
    },
  );
});

function sanitize(input: Partial<BookInput> & { id?: string }) {
  // Only allow known fields through — never trust the raw request body
  // straight into the database.
  const {
    id,
    title,
    type,
    unit_type,
    progress_structure,
    parent_progress,
    parent_total,
    latest_units,
    is_ongoing,
    author,
    status,
    rating,
    progress,
    total_units,
    genre_tags,
    source_link,
    cover_url,
    date_started,
    date_finished,
    notes,
    is_favorite,
    series_name,
    series_order,
    shelf_names,
    reread_count,
  } = input;

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Title is required');
  }
  const cleanRating = rating != null && rating > 0 ? rating : null;
  if (cleanRating != null && (cleanRating < 0.5 || cleanRating > 5)) {
    throw new Error('Rating must be between 0.5 and 5');
  }

  const cleanProg = progress != null && !Number.isNaN(Number(progress)) ? Number(progress) : 0;
  const cleanTotal =
    total_units != null && !Number.isNaN(Number(total_units)) ? Number(total_units) : null;
  const cleanParentProg =
    parent_progress != null && !Number.isNaN(Number(parent_progress))
      ? Number(parent_progress)
      : null;
  const cleanParentTot =
    parent_total != null && !Number.isNaN(Number(parent_total)) ? Number(parent_total) : null;
  const cleanLatest =
    latest_units != null && !Number.isNaN(Number(latest_units)) ? Number(latest_units) : null;
  const cleanSeriesOrder =
    series_order != null && !Number.isNaN(Number(series_order)) ? Number(series_order) : null;
  const cleanRereadCount =
    reread_count != null && !Number.isNaN(Number(reread_count)) ? Number(reread_count) : 0;

  const validUuid =
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
      ? id.trim()
      : undefined;

  return {
    ...(validUuid ? { id: validUuid } : {}),
    title: title.trim(),
    type: type || 'Novel',
    unit_type: unit_type || 'pages',
    progress_structure: progress_structure || 'single',
    parent_progress: cleanParentProg,
    parent_total: cleanParentTot,
    latest_units: cleanLatest,
    is_ongoing: Boolean(is_ongoing),
    author: author || null,
    status: status || 'Plan to Read',
    rating: cleanRating,
    progress: cleanProg,
    total_units: cleanTotal,
    genre_tags: genre_tags || null,
    source_link: source_link || null,
    cover_url: cover_url || null,
    date_started: date_started || null,
    date_finished: date_finished || null,
    notes: notes || null,
    is_favorite: Boolean(is_favorite),
    series_name: series_name?.trim() || null,
    series_order: cleanSeriesOrder,
    shelf_names: shelf_names || null,
    reread_count: cleanRereadCount,
  };
}

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  let clean: ReturnType<typeof sanitize>;
  try {
    clean = sanitize(body);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const progError = validateProgressionFields(clean as any);
  if (progError) {
    return NextResponse.json({ error: progError }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.from('books').insert(clean).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create initial Journey #1 and insert simulated logs if provided
  const isCompleted = data.status === 'Completed';
  const isReading = data.status === 'Reading';

  if (
    isCompleted ||
    isReading ||
    (Array.isArray(body.simulated_logs) && body.simulated_logs.length > 0)
  ) {
    // Check if a Journey #1 already exists for this book before inserting
    const { data: existingJourneys } = await supabase
      .from('reading_journeys')
      .select('*')
      .eq('book_id', data.id)
      .eq('journey_index', 1)
      .limit(1);

    let journeyData = existingJourneys && existingJourneys.length > 0 ? existingJourneys[0] : null;

    if (!journeyData) {
      const { data: createdJourney } = await supabase
        .from('reading_journeys')
        .insert({
          book_id: data.id,
          journey_index: 1,
          status: isCompleted ? 'completed' : 'reading',
          date_started: data.date_started || data.created_at || new Date().toISOString(),
          date_finished: isCompleted ? data.date_finished || new Date().toISOString() : null,
          rating: isCompleted ? data.rating : null,
        })
        .select()
        .single();
      journeyData = createdJourney;
    }

    if (journeyData && Array.isArray(body.simulated_logs) && body.simulated_logs.length > 0) {
      const logsToInsert = body.simulated_logs
        .filter(
          (log: any) =>
            log &&
            typeof log === 'object' &&
            Number.isFinite(Number(log.to_progress)) &&
            Number(log.to_progress) >= 0,
        )
        .map((log: any) => ({
          book_id: data.id,
          journey_id: journeyData.id,
          from_progress: Number.isFinite(Number(log.from_progress)) ? Number(log.from_progress) : 0,
          to_progress: Number(log.to_progress),
          note: typeof log.note === 'string' ? log.note.slice(0, 1000) : null,
          logged_at:
            typeof log.logged_at === 'string' && !Number.isNaN(Date.parse(log.logged_at))
              ? log.logged_at
              : new Date().toISOString(),
        }));

      if (logsToInsert.length > 0) {
        await supabase.from('reading_log').insert(logsToInsert);
      }
    }
  }

  return NextResponse.json({ book: data }, { status: 201 });
});
