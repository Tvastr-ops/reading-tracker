import { jwtVerify } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

// IMPORTANT: as of Next.js 16, this file (proxy.ts, formerly middleware.ts)
// is NOT the security boundary. It only exists to redirect signed-out users
// away from page routes for a smoother UX (avoids a flash of the app before
// bouncing to /login). Every API route independently re-verifies the
// session itself via requireAuthenticatedRequest() in lib/auth.ts — so even
// if this file were skipped or bypassed entirely, no data route is exposed.
async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    await jwtVerify(token, secret, {
      clockTolerance: '300s', // 300s clock skew tolerance to prevent premature token rejections
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webmanifest');

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get('session')?.value;
  const valid = await isValidSession(token);

  if (!valid) {
    if (pathname.startsWith('/api')) {
      // Fast-path only. The route handler itself enforces this too.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
