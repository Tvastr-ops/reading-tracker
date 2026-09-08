import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { generateObsidianVaultZip } from '@/lib/obsidian-exporter';
import { supabaseServer } from '@/lib/supabase';
import type { Book, ReadingLogEntry } from '@/lib/types';

// Next.js 14+ caches server-side fetch() calls by default, and the Supabase
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
  'description',
  'notes',
  'unit_type',
  'progress_structure',
  'parent_progress',
  'parent_total',
  'latest_units',
  'is_ongoing',
  'is_favorite',
  'series_name',
  'series_order',
  'shelf_names',
  'reread_count',
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

export const GET = withAuth(async (req: NextRequest) => {
  const supabase = supabaseServer();
  const format = req.nextUrl.searchParams.get('format')?.toLowerCase() || 'csv';
  const today = new Date().toISOString().slice(0, 10);

  // 1. Obsidian Turnkey Vault (.zip)
  if (format === 'obsidian') {
    const [{ data: books, error: booksError }, { data: logs, error: logsError }] =
      await Promise.all([
        supabase
          .from('books')
          .select('*')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }),
        supabase.from('reading_log').select('*').order('logged_at', { ascending: false }),
      ]);

    if (booksError) return NextResponse.json({ error: booksError.message }, { status: 500 });
    if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });

    const zipBytes = await generateObsidianVaultZip(
      (books as Book[]) || [],
      (logs as ReadingLogEntry[]) || [],
    );

    return new NextResponse(Buffer.from(zipBytes), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="reading-vault-${today}.zip"`,
      },
    });
  }

  // 2. Full JSON Database Backup
  if (format === 'json') {
    const [
      { data: books, error: booksError },
      { data: journeys, error: journeysError },
      { data: logs, error: logsError },
    ] = await Promise.all([
      supabase
        .from('books')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase.from('reading_journeys').select('*'),
      supabase.from('reading_log').select('*').order('logged_at', { ascending: false }),
    ]);

    if (booksError) return NextResponse.json({ error: booksError.message }, { status: 500 });
    if (journeysError) return NextResponse.json({ error: journeysError.message }, { status: 500 });
    if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });

    const payload = {
      version: '3.0',
      exported_at: new Date().toISOString(),
      app: 'Reading Tracker',
      books_count: (books || []).length,
      journeys_count: (journeys || []).length,
      logs_count: (logs || []).length,
      books: books || [],
      reading_journeys: journeys || [],
      reading_logs: logs || [],
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="reading-tracker-backup-${today}.json"`,
      },
    });
  }

  // 3. Spreadsheet CSV (Default / Fallback)
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
      'Content-Disposition': `attachment; filename="reading-tracker-export-${today}.csv"`,
    },
  });
});
