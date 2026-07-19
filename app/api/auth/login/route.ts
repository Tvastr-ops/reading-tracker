import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

// Very small in-memory rate limiter (per server instance) to slow down
// brute-force attempts against the single app password.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!checkPassword(password)) {
    const next = entry && entry.resetAt > now
      ? { count: entry.count + 1, resetAt: entry.resetAt }
      : { count: 1, resetAt: now + WINDOW_MS };
    attempts.set(ip, next);
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  attempts.delete(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
