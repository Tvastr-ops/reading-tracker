import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { extractMetadataFromUrl, validateTargetUrl } from '@/lib/metadata-extractor';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: NextRequest) => {
  let body: { url?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const validation = validateTargetUrl(rawUrl);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error || 'Invalid URL' }, { status: 400 });
  }

  try {
    const metadata = await extractMetadataFromUrl(rawUrl);
    return NextResponse.json({ data: metadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to extract metadata from this URL';
    return NextResponse.json({ error: message }, { status: 422 });
  }
});
