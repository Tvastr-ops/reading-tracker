import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { recordProgressChange } from '@/lib/progressMutation';
import { supabaseServer } from '@/lib/supabase';

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
  const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null;

  // Execute authoritative atomic domain operation
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

  const supabase = supabaseServer();
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
