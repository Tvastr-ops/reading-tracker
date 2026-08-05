import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import type { BookInput } from '@/lib/types';

// See app/api/export/route.ts for why this is required.
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest) => {
  const showTrash = req.nextUrl.searchParams.get('trash') === '1';

  const supabase = supabaseServer();
  let query = supabase.from('books').select('*');
  query = showTrash ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
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

function sanitize(input: Partial<BookInput>) {
  // Only allow known fields through — never trust the raw request body
  // straight into the database.
  const {
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
  } = input;

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Title is required');
  }
  if (rating != null && (rating < 0 || rating > 5)) {
    throw new Error('Rating must be between 0 and 5');
  }

  return {
    title: title.trim(),
    type: type || 'Novel',
    unit_type: unit_type || 'pages',
    progress_structure: progress_structure || 'single',
    parent_progress: parent_progress ?? null,
    parent_total: parent_total ?? null,
    latest_units: latest_units ?? null,
    is_ongoing: is_ongoing ?? false,
    author: author || null,
    status: status || 'Plan to Read',
    rating: rating ?? null,
    progress: progress ?? 0,
    total_units: total_units ?? null,
    genre_tags: genre_tags || null,
    source_link: source_link || null,
    cover_url: cover_url || null,
    date_started: date_started || null,
    date_finished: date_finished || null,
    notes: notes || null,
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

  const supabase = supabaseServer();
  const { data, error } = await supabase.from('books').insert(clean).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ book: data }, { status: 201 });
});
