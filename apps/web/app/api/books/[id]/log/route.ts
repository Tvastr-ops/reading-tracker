import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { recordProgressChange } from '@/lib/progressMutation';
import { supabaseServer } from '@/lib/supabase';
import { validateProgressionFields } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('reading_log')
    .select('*')
    .eq('book_id', id)
    .order('logged_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
});

export const POST = withAuth(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const toProgress = Number(body?.to_progress);
  if (!Number.isFinite(toProgress) || toProgress < 0) {
    return NextResponse.json(
      { error: 'to_progress must be a non-negative number' },
      { status: 400 },
    );
  }
  let journeyId =
    typeof body?.journey_id === 'string' && UUID_RE.test(body.journey_id) ? body.journey_id : null;
  const clientLogId = typeof body?.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  const fromProgress = Number.isFinite(Number(body?.from_progress))
    ? Number(body.from_progress)
    : 0;
  const loggedAt =
    typeof body?.logged_at === 'string' && !Number.isNaN(Date.parse(body.logged_at))
      ? body.logged_at
      : new Date().toISOString();
  const note = typeof body?.note === 'string' ? body.note : null;

  const supabase = supabaseServer();

  // Validate book exists and enforce progression domain bounds (F-06)
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select(
      'id, progress, total_units, latest_units, is_ongoing, unit_type, progress_structure, parent_progress, parent_total',
    )
    .eq('id', id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const validationError = validateProgressionFields({
    ...book,
    progress: toProgress,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!journeyId) {
    const { data: latestJourneys } = await supabase
      .from('reading_journeys')
      .select('id')
      .eq('book_id', id)
      .order('journey_index', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);

    if (latestJourneys && latestJourneys.length > 0) {
      journeyId = latestJourneys[0].id;
    }
  }

  // If client provided a deterministic UUID (from offline sync or mobile client), upsert directly
  if (clientLogId) {
    const { data: logEntry, error: logError } = await supabase
      .from('reading_log')
      .upsert(
        {
          id: clientLogId,
          book_id: id,
          journey_id: journeyId,
          from_progress: fromProgress,
          to_progress: toProgress,
          note: note,
          logged_at: loggedAt,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // Update book progress & trigger atomic pace recalculation
    const progressResult = await recordProgressChange({
      bookId: id,
      toProgress,
      createLog: false,
      note,
    });

    return NextResponse.json(
      { entry: logEntry, pace: progressResult.data?.pace ?? null },
      { status: 201 },
    );
  }

  // Execute authoritative atomic domain operation when log ID is generated server-side
  const result = await recordProgressChange({
    bookId: id,
    toProgress,
    createLog: true,
    note,
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error || 'Failed to record progress' },
      { status: 500 },
    );
  }

  let entry = null;
  if (result.data.entryId) {
    const { data: logEntry } = await supabase
      .from('reading_log')
      .select('*')
      .eq('id', result.data.entryId)
      .single();
    entry = logEntry;
  }

  return NextResponse.json({ entry, pace: result.data.pace }, { status: 201 });
});

export const DELETE = withAuth(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const logId = req.nextUrl.searchParams.get('log_id');
  const supabase = supabaseServer();

  if (logId) {
    if (!UUID_RE.test(logId))
      return NextResponse.json({ error: 'Invalid log_id' }, { status: 400 });
    const { error } = await supabase.from('reading_log').delete().eq('id', logId).eq('book_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Clear all logs for this book
  const { error } = await supabase.from('reading_log').delete().eq('book_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
});
