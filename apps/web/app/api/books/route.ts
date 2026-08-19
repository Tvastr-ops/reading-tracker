import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import type { BookInput } from '@/lib/types';
import { validateProgressionFields } from '@/lib/validation';

// See app/api/export/route.ts for why this is required.
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest) => {
  const showTrash = req.nextUrl.searchParams.get('trash') === '1';
  const includeAll =
    req.nextUrl.searchParams.get('all') === '1' || req.nextUrl.searchParams.get('sync') === '1';

  const supabase = supabaseServer();
  let query = supabase
    .from('books')
    .select(
      'id, title, type, unit_type, progress_structure, parent_progress, parent_total, latest_units, is_ongoing, author, status, rating, progress, total_units, genre_tags, source_link, cover_url, reading_pace, date_started, date_finished, notes, is_favorite, deleted_at, created_at, updated_at',
    );
  if (!includeAll) {
    query = showTrash ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  }
  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { books: data },
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
  return NextResponse.json({ book: data }, { status: 201 });
});
