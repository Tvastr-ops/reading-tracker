import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { recordProgressChange } from '@/lib/progressMutation';
import { supabaseServer } from '@/lib/supabase';
import { validateProgressionFields } from '@/lib/validation';

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
        if (key === 'rating' && (val === 0 || val === '0' || val === '')) {
          update[key] = null;
        } else {
          update[key] = val === '' ? null : val;
        }
      }
    }
    const isOnlyFavoriteUpdate = Object.keys(update).length === 1 && 'is_favorite' in update;
    if (!isOnlyFavoriteUpdate && body.preserve_updated_at !== true) {
      update.updated_at = new Date().toISOString();
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  if ('title' in update && (typeof update.title !== 'string' || !update.title.trim())) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }
  if ('rating' in update) {
    const r = update.rating as number | null;
    if (r != null && (r < 0.5 || r > 5)) {
      return NextResponse.json({ error: 'Rating must be between 0.5 and 5' }, { status: 400 });
    }
  }

  const supabase = supabaseServer();

  // Validate progression invariants if any progression fields are being modified
  const progressionKeys = [
    'progress',
    'total_units',
    'parent_progress',
    'parent_total',
    'latest_units',
    'is_ongoing',
    'unit_type',
    'progress_structure',
  ];
  const hasProgressionUpdates = progressionKeys.some((k) => k in update);

  if (hasProgressionUpdates) {
    const { data: existingBook, error: fetchErr } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const merged = { ...existingBook, ...update };
    const progError = validateProgressionFields(merged);
    if (progError) {
      return NextResponse.json({ error: progError }, { status: 400 });
    }

    // If progress is changed, mutate it atomically via domain operation (which creates log and recalculates pace)
    if ('progress' in update && typeof update.progress === 'number') {
      const toProg = update.progress;
      if (existingBook.progress !== toProg) {
        const delta = toProg - (existingBook.progress ?? 0);
        const sign = delta >= 0 ? '+' : '';
        const customNote = typeof body.note === 'string' ? body.note : null;
        const note =
          customNote || `Progress update (${sign}${delta} ${existingBook.unit_type || 'units'})`;

        const progResult = await recordProgressChange({
          bookId: id,
          toProgress: toProg,
          createLog: true,
          note,
        });

        if (progResult.error) {
          return NextResponse.json({ error: progResult.error }, { status: 400 });
        }
      }
      // Remove progress so subsequent update won't conflict with the RPC
      delete update.progress;
    }
  }

  // Update remaining metadata if any fields remain
  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabase.from('books').update(update).eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fetch and return the fresh book row (with updated progress and reading_pace)
  const { data: freshBook, error: freshErr } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (freshErr) return NextResponse.json({ error: freshErr.message }, { status: 500 });
  return NextResponse.json({ book: freshBook });
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
