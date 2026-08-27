import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest) => {
  const since = req.nextUrl.searchParams.get('since');
  const bookId = req.nextUrl.searchParams.get('book_id');
  const bookIdsParam = req.nextUrl.searchParams.get('book_ids');
  const limitParam = req.nextUrl.searchParams.get('limit');

  const supabase = supabaseServer();
  let query = supabase.from('reading_log').select('*').order('logged_at', { ascending: false });

  if (since) {
    query = query.gt('logged_at', since);
  }
  if (bookId) {
    query = query.eq('book_id', bookId);
  } else if (bookIdsParam) {
    const ids = bookIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length > 0) {
      query = query.in('book_id', ids);
    }
  }
  if (limitParam) {
    const limit = Math.min(10000, Math.max(1, Number.parseInt(limitParam, 10) || 1000));
    query = query.limit(limit);
  } else if (!since && !bookId) {
    // Return up to 10,000 logs on full reconciliation
    query = query.limit(10000);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { entries: data ?? [] },
    {
      headers: {
        'Cache-Control': 'private, no-cache, must-revalidate',
      },
    },
  );
});
