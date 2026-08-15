import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkPassword,
  createSessionToken,
  requireAuthenticatedRequest,
  verifySessionToken,
} from '../lib/auth';

// Ensure required test secret is set
process.env.SESSION_SECRET = 'a-very-long-test-session-secret-key-32chars!';
process.env.APP_PASSWORD = 'super-secret-password-123';

test('checkPassword validates correct password', () => {
  assert.equal(checkPassword('super-secret-password-123'), true);
  assert.equal(checkPassword('wrong-password'), false);
  assert.equal(checkPassword(''), false);
});

test('JWT session token creation and verification', async () => {
  const token = await createSessionToken();
  assert.equal(typeof token, 'string');
  const valid = await verifySessionToken(token);
  assert.equal(valid, true);

  const invalid = await verifySessionToken('invalid.jwt.token');
  assert.equal(invalid, false);
});

test('requireAuthenticatedRequest authenticates via session cookie', async () => {
  const token = await createSessionToken();
  const reqWithCookie = {
    cookies: {
      get: (name: string) => (name === 'session' ? { value: token } : undefined),
    },
  };
  assert.equal(await requireAuthenticatedRequest(reqWithCookie), true);
});

test('requireAuthenticatedRequest authenticates via x-api-key header', async () => {
  const reqWithApiKey = {
    cookies: {
      get: () => undefined,
    },
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'x-api-key' ? 'super-secret-password-123' : null,
    },
  };
  assert.equal(await requireAuthenticatedRequest(reqWithApiKey), true);
});

test('requireAuthenticatedRequest authenticates via Authorization Bearer header', async () => {
  const reqWithBearer = {
    cookies: {
      get: () => undefined,
    },
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'authorization' ? 'Bearer super-secret-password-123' : null,
    },
  };
  assert.equal(await requireAuthenticatedRequest(reqWithBearer), true);
});

test('requireAuthenticatedRequest rejects unauthenticated request', async () => {
  const unauthReq = {
    cookies: {
      get: () => undefined,
    },
    headers: {
      get: () => null,
    },
  };
  assert.equal(await requireAuthenticatedRequest(unauthReq), false);
});
