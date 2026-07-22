import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth(async (req: NextRequest, { params }: RouteContext) => {
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

// Adding a log entry also updates the book's own `progress` field to match
// the latest entry, so the progress bar elsewhere in the app stays in sync
// without the user having to update it twice.
export const POST = withAuth(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const toProgress = Number(body?.to_progress);
  if (!Number.isFinite(toProgress) || toProgress < 0) {
    return NextResponse.json({ error: 'to_progress must be a non-negative number' }, { status: 400 });
  }
  const fromProgress = body?.from_progress != null ? Number(body.from_progress) : null;
  const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null;

  const supabase = supabaseServer();

  const { data: entry, error: insertError } = await supabase
    .from('reading_log')
    .insert({ book_id: id, from_progress: fromProgress, to_progress: toProgress, note })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: updateError } = await supabase
    .from('books')
    .update({ progress: toProgress })
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ entry }, { status: 201 });
});
