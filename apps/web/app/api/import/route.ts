import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const KNOWN_COLUMNS = [
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

const VALID_STATUSES = ['Plan to Read', 'Reading', 'On Hold', 'Completed', 'Dropped'];
const VALID_UNIT_TYPES = ['pages', 'chapters', 'words', 'percent', 'volumes', 'units'];
const VALID_STRUCTURES = ['single', 'volume_chapter', 'part_chapter'];

// Minimal RFC4180-style CSV parser: handles quoted fields, escaped quotes
// (""), and commas/newlines inside quotes. No external dependency needed
// for something this small.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // skip, \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function toNullableNumber(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const csvText = typeof body?.csv === 'string' ? body.csv : null;
  if (!csvText?.trim()) {
    return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: 'CSV needs a header row plus at least one data row' },
      { status: 400 },
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex: Record<string, number> = {};
  for (const col of KNOWN_COLUMNS) {
    const idx = header.indexOf(col);
    if (idx !== -1) colIndex[col] = idx;
  }
  if (colIndex.title == null) {
    return NextResponse.json(
      { error: 'CSV header must include a "title" column' },
      { status: 400 },
    );
  }

  const toInsert: Record<string, unknown>[] = [];
  const skipped: number[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (col: string) => (colIndex[col] != null ? cells[colIndex[col]]?.trim() : undefined);

    const title = get('title');
    if (!title) {
      skipped.push(r + 1);
      continue;
    }

    const status = get('status');
    const rating = toNullableNumber(get('rating'));
    const isOngoingStr = get('is_ongoing')?.toLowerCase();
    const is_ongoing = isOngoingStr === 'true' || isOngoingStr === '1';

    const rawUnit = get('unit_type');
    const rawStruct = get('progress_structure');

    const isFavStr = get('is_favorite')?.toLowerCase();
    const is_favorite = isFavStr === 'true' || isFavStr === '1';

    toInsert.push({
      title,
      type: get('type') || 'Novel',
      unit_type: rawUnit && VALID_UNIT_TYPES.includes(rawUnit) ? rawUnit : 'pages',
      progress_structure: rawStruct && VALID_STRUCTURES.includes(rawStruct) ? rawStruct : 'single',
      parent_progress: toNullableNumber(get('parent_progress')),
      parent_total: toNullableNumber(get('parent_total')),
      latest_units: toNullableNumber(get('latest_units')),
      is_ongoing,
      author: get('author') || null,
      status: status && VALID_STATUSES.includes(status) ? status : 'Plan to Read',
      rating: rating != null && rating >= 0 && rating <= 5 ? rating : null,
      progress: toNullableNumber(get('progress')) ?? 0,
      total_units: toNullableNumber(get('total_units')),
      genre_tags: get('genre_tags') || null,
      source_link: get('source_link') || null,
      cover_url: get('cover_url') || null,
      date_started: get('date_started') || null,
      date_finished: get('date_finished') || null,
      notes: get('notes') || null,
      is_favorite,
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json(
      { error: 'No valid rows found (each row needs a title)' },
      { status: 400 },
    );
  }

  const supabase = supabaseServer();

  // Deduplicate titles in targeted batches to avoid loading full database into memory
  const batchSize = 100;
  const deduped: typeof toInsert = [];
  let skippedDuplicates = 0;
  const seenInBatch = new Set<string>();

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const chunk = toInsert.slice(i, i + batchSize);
    const chunkTitles = chunk.map((r) => String(r.title).trim());

    const { data: existing, error: existingError } = await supabase
      .from('books')
      .select('title')
      .is('deleted_at', null)
      .in('title', chunkTitles);

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    const existingTitles = new Set(
      (existing || []).map((b: any) => String(b.title).trim().toLowerCase()),
    );

    for (const row of chunk) {
      const key = String(row.title).trim().toLowerCase();
      if (existingTitles.has(key) || seenInBatch.has(key)) {
        skippedDuplicates++;
        continue;
      }
      seenInBatch.add(key);
      deduped.push(row);
    }
  }

  if (deduped.length === 0) {
    return NextResponse.json({ imported: 0, skippedRows: skipped, skippedDuplicates });
  }

  const { data, error } = await supabase.from('books').insert(deduped).select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    imported: data?.length ?? 0,
    skippedRows: skipped,
    skippedDuplicates,
  });
});
