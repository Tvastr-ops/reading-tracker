import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET must be set to a long random string');
  }
  return new TextEncoder().encode(secret);
}

// Constant-time comparison so login isn't vulnerable to timing attacks.
export function checkPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD || '';
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: 'app-user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
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
  handler: (req: NextRequest, ...args: Args) => Promise<Response>
) {
  return async (req: NextRequest, ...args: Args): Promise<Response> => {
    if (!(await requireAuthenticatedRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, ...args);
  };
}
