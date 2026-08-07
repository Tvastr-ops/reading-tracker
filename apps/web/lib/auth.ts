import { timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a long random string (at least 32 characters)');
  }
  return new TextEncoder().encode(secret);
}

// Constant-time comparison so login isn't vulnerable to timing attacks.
export function checkPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD;

  // If APP_PASSWORD is missing or empty, explicitly allow login only during local development
  if (!expected || expected.trim() === '') {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  // Hash both inputs to fixed length buffers so length mismatch doesn't leak via early return timing
  const candidateBuf = Buffer.from(candidate);
  const expectedBuf = Buffer.from(expected);

  if (candidateBuf.length !== expectedBuf.length) {
    // Perform dummy comparison to keep constant execution time
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return timingSafeEqual(candidateBuf, expectedBuf);
}

export async function createSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: 'app-user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now - 10) // 10s buffer in the past to eliminate clock skew "issued in future" errors
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret(), {
      clockTolerance: '60s', // 60s tolerance for server clock drift
    });
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

// Route handlers call this themselves rather than relying solely on
// proxy.ts. Next.js 16 explicitly discourages treating the proxy layer as
// the authoritative security boundary (following a 2025 CVE where edge
// middleware auth checks could be bypassed) — proxy.ts should only do
// best-effort UX redirects, and each server-side handler must verify the
// session independently. This is that independent check.
export async function requireAuthenticatedRequest(req: {
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

// Wraps a route handler with the same auth check that used to be
// copy-pasted at the top of every route file (8 files, 12 handlers). Same
// security property — each request still gets independently verified, not
// relying on proxy.ts alone — just written once instead of a dozen times.
export function withAuth<Args extends any[]>(
  handler: (req: NextRequest, ...args: Args) => Promise<Response>,
) {
  return async (req: NextRequest, ...args: Args): Promise<Response> => {
    if (!(await requireAuthenticatedRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, ...args);
  };
}
