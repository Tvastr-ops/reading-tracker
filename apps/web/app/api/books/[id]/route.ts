import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

// See app/api/export/route.ts for why this is required.
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FIELDS = [
  'title',
  'type',
  'unit_type',
  'progress_structure',
  'parent_progress',
  'parent_total',
  'latest_units',
  'is_ongoing',
  'author',
  'status',
  'rating',
  'progress',
  'total_units',
  'genre_tags',
  'source_link',
  'cover_url',
  'date_started',
  'date_finished',
  'notes',
  'is_favorite',
];

// Next.js 15+ made dynamic route `params` a Promise (was a plain object in 14).
type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  // Restore-from-trash is a special-cased update, not a free-form field.
  if (body.restore === true) {
    update.deleted_at = null;
    update.updated_at = new Date().toISOString();
  } else {
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        const val = body[key];
        update[key] = val === '' ? null : val;
      }
    }
    update.updated_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  if ('title' in update && (typeof update.title !== 'string' || !update.title.trim())) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }
  if ('rating' in update) {
    const r = update.rating as number | null;
    if (r != null && (r < 0 || r > 5)) {
      return NextResponse.json({ error: 'Rating must be between 0 and 5' }, { status: 400 });
    }
  }
  if ('progress' in update && (typeof update.progress !== 'number' || update.progress < 0)) {
    return NextResponse.json({ error: 'Progress must be a non-negative number' }, { status: 400 });
  }
  if (
    'total_units' in update &&
    update.total_units != null &&
    (typeof update.total_units !== 'number' || update.total_units < 0)
  ) {
    return NextResponse.json(
      { error: 'Total units must be a non-negative number' },
      { status: 400 },
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('books')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ book: data });
});

// Soft delete by default (sets deleted_at). Pass ?permanent=1 to actually
// remove the row — used only from the trash view, after a confirm dialog.
export const DELETE = withAuth(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const permanent = req.nextUrl.searchParams.get('permanent') === '1';
  const supabase = supabaseServer();

  if (permanent) {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from('books')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
