import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

// Next.js 14 caches server-side fetch() calls by default, and the Supabase
// client uses fetch internally — without this, the first export would get
// cached forever and every later export would serve that same stale data.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'title',
  'type',
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
  'unit_type',
  'progress_structure',
  'parent_progress',
  'parent_total',
  'latest_units',
  'is_ongoing',
];

function csvEscape(val: unknown): string {
  if (val == null) return '';
  let s = String(val);
  // Prevent CSV Formula Injection by prepending ' to formula triggers
  if (/^[=+@\-\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const GET = withAuth(async (_req: NextRequest) => {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('books')
    .select(COLUMNS.join(','))
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = [COLUMNS.join(',')];
  for (const book of data as any[]) {
    rows.push(COLUMNS.map((c) => csvEscape(book[c])).join(','));
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="reading-tracker-export.csv"',
    },
  });
});
