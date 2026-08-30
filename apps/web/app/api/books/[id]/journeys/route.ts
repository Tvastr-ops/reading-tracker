import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('reading_journeys')
    .select('*')
    .eq('book_id', id)
    .order('journey_index', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate any duplicate journey_index records
  const deduped: any[] = [];
  const seen = new Set<number>();
  for (const j of data || []) {
    if (!seen.has(j.journey_index)) {
      seen.add(j.journey_index);
      deduped.push(j);
    }
  }

  return NextResponse.json({ journeys: deduped });
});

export const POST = withAuth(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const supabase = supabaseServer();

  // 1. Fetch current book to determine reread count and user_id
  const { data: book, error: bookErr } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (bookErr || !book) {
    return NextResponse.json({ error: bookErr?.message || 'Book not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const currentReread = Number(book.reread_count) || 0;
  const nextReread = currentReread + 1;

  // Determine next journey index from existing journeys or reread count (F-10)
  const { data: maxJ } = await supabase
    .from('reading_journeys')
    .select('journey_index')
    .eq('book_id', id)
    .order('journey_index', { ascending: false })
    .limit(1);

  const maxIndex = maxJ?.[0]?.journey_index ?? currentReread + 1;
  const nextJourneyIndex = Math.max(maxIndex + 1, nextReread + 1);

  // 2. Finalize any active journey
  await supabase
    .from('reading_journeys')
    .update({
      status: 'completed',
      date_finished: now,
      updated_at: now,
    })
    .eq('book_id', id)
    .eq('status', 'reading');

  // 3. Create new journey
  const newJourneyId =
    typeof body?.id === 'string' && UUID_RE.test(body.id) ? body.id : crypto.randomUUID();
  const { data: journey, error: journeyErr } = await supabase
    .from('reading_journeys')
    .insert({
      id: newJourneyId,
      book_id: id,
      user_id: book.user_id,
      journey_index: nextJourneyIndex,
      status: 'reading',
      date_started: now,
      date_finished: null,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (journeyErr) {
    return NextResponse.json({ error: journeyErr.message }, { status: 500 });
  }

  // 4. Update book state (reset progress to 0, status to Reading, increment reread_count, reset reading_pace) (F-11)
  const { data: updatedBook, error: updateErr } = await supabase
    .from('books')
    .update({
      progress: 0,
      reading_pace: null,
      parent_progress: book.progress_structure !== 'single' ? 1 : null,
      status: 'Reading',
      reread_count: nextReread,
      date_started: now,
      date_finished: null,
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ journey, book: updatedBook }, { status: 201 });
});
