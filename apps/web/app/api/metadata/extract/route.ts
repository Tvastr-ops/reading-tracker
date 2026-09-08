import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { extractMetadata } from '@/lib/metadata-extractor';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: NextRequest) => {
  let body: { url?: string; input?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawInput = (body.url || body.input)?.trim();
  if (!rawInput) {
    return NextResponse.json({ error: 'URL, ISBN, or identifier is required' }, { status: 400 });
  }

  try {
    const metadata = await extractMetadata(rawInput);
    return NextResponse.json({ data: metadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to extract metadata';
    return NextResponse.json({ error: message }, { status: 422 });
  }
});
