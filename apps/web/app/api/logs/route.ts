import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest) => {
  const since = req.nextUrl.searchParams.get('since');
  const bookId = req.nextUrl.searchParams.get('book_id');

  const supabase = supabaseServer();
  let query = supabase
    .from('reading_log')
    .select('*')
    .order('logged_at', { ascending: false });

  if (since) {
    query = query.gt('logged_at', since);
  }
  if (bookId) {
    query = query.eq('book_id', bookId);
  }

  const { data, error } = await query.limit(1000);

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
