import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { normalizeStatusTransition } from '@/lib/progress';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ['Plan to Read', 'Reading', 'On Hold', 'Completed', 'Dropped'];
const MAX_IDS = 500;

// A single endpoint for all bulk row-selection actions, rather than looping
// N individual requests from the client.
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const ids: unknown = body?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Too many ids (max ${MAX_IDS})` }, { status: 400 });
  }
  const cleanIds = ids.filter((id) => typeof id === 'string' && UUID_RE.test(id));
  if (cleanIds.length === 0) {
    return NextResponse.json({ error: 'No valid ids provided' }, { status: 400 });
  }

  const supabase = supabaseServer();

  if (action === 'status') {
    const status = body?.status;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const today =
      typeof body?.localDate === 'string' && body.localDate
        ? body.localDate
        : new Date().toISOString().split('T')[0];

    const { data: targetBooks, error: fetchErr } = await supabase
      .from('books')
      .select('*')
      .in('id', cleanIds);

    if (fetchErr || !targetBooks) {
      return NextResponse.json(
        { error: fetchErr?.message || 'Failed to fetch books' },
        { status: 500 },
      );
    }

    const updates = targetBooks.map((b) => ({
      ...b,
      ...normalizeStatusTransition(b, status, today),
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase.from('books').upsert(updates, { onConflict: 'id' });

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    return NextResponse.json({ updated: updates.length });
  }

  if (action === 'rating') {
    const rating = Number(body?.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }
    const { error } = await supabase.from('books').update({ rating }).in('id', cleanIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: cleanIds.length });
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('books')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', cleanIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: cleanIds.length });
  }

  if (action === 'restore') {
    const { error } = await supabase.from('books').update({ deleted_at: null }).in('id', cleanIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: cleanIds.length });
  }

  if (action === 'delete_permanent') {
    const { error } = await supabase.from('books').delete().in('id', cleanIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: cleanIds.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});
