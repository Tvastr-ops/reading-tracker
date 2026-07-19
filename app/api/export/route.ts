import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireAuthenticatedRequest } from '@/lib/auth';

// Next.js 14 caches server-side fetch() calls by default, and the Supabase
// client uses fetch internally — without this, the first export would get
// cached forever and every later export would serve that same stale data.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'title', 'type', 'author', 'status', 'rating', 'progress', 'total_units',
  'genre_tags', 'source_link', 'date_started', 'date_finished', 'notes',
];

function csvEscape(val: unknown): string {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  if (!(await requireAuthenticatedRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
}
