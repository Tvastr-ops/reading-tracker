import { SignJWT, jwtVerify } from 'jose';
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
