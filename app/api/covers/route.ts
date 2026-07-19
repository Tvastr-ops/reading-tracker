import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Open Library is free, keyless, and has no rate-limit issues at personal-use
// volume. We only ever store the resulting *URL* string on a book (a few
// dozen bytes), never the image itself — keeps DB storage negligible.
export async function GET(req: NextRequest) {
  if (!(await requireAuthenticatedRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const title = req.nextUrl.searchParams.get('title')?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title query param required' }, { status: 400 });
  }

  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=5&fields=title,author_name,cover_i`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'reading-tracker-personal-app' } });
  } catch {
    return NextResponse.json({ error: 'Cover search is unavailable right now' }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: 'Cover search is unavailable right now' }, { status: 502 });
  }

  const data = await res.json().catch(() => null);
  const docs: any[] = Array.isArray(data?.docs) ? data.docs : [];

  const results = docs
    .filter((d) => d.cover_i)
    .slice(0, 5)
    .map((d) => ({
      title: d.title as string,
      author: Array.isArray(d.author_name) ? d.author_name[0] : null,
      cover_url: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
    }));

  return NextResponse.json({ results });
}
