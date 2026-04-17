/**
 * Backend unit tests: health endpoint, 401 unauth proxy, mocked proxy round-trip.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock firebase-admin before any module imports it ---
const mockVerifyIdToken = vi.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@example.com' });
vi.mock('firebase-admin', () => {
  const auth = () => ({ verifyIdToken: mockVerifyIdToken });
  const adminMock = {
    apps: [] as unknown[],
    initializeApp: vi.fn(() => { adminMock.apps.push({}); }),
    credential: { cert: vi.fn((x: unknown) => x) },
    auth,
  };
  return { default: adminMock, ...adminMock };
});

// --- Mock undici ---
const mockUndiciRequest = vi.fn();
vi.mock('undici', () => ({
  request: mockUndiciRequest,
}));

// --- Mock dotenv (no .env file in test env) ---
vi.mock('dotenv/config', () => ({}));

// Build a fresh Fastify app for each test to isolate env state
async function buildApp(requireAuth = false) {
  process.env.REQUIRE_AUTH = requireAuth ? 'true' : 'false';
  if (requireAuth) {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      type: 'service_account',
      project_id: 'test',
      private_key_id: 'key-id',
      private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----\n',
      client_email: 'test@test.iam.gserviceaccount.com',
      client_id: '123',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    });
  }

  // Dynamic import so vi.mock is applied before module evaluation
  const { default: Fastify } = await import('fastify');
  const { default: cors } = await import('@fastify/cors');
  const { registerProxy } = await import('./proxy.js');
  const { initFirebaseAdmin } = await import('./auth.js');

  if (requireAuth) {
    initFirebaseAdmin();
  }

  const app = Fastify({ logger: false });
  await app.register(cors, {
    origin: ['http://localhost:5173'],
    exposedHeaders: ['X-Upstream-Status', 'X-Upstream-Status-Text', 'X-Upstream-Headers'],
  });
  app.get('/health', async () => ({ ok: true }));
  registerProxy(app);
  await app.ready();
  return app;
}

describe('GET /health', () => {
  it('returns 200 { ok: true } without authentication', async () => {
    const app = await buildApp(false);
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});

describe('POST /proxy — REQUIRE_AUTH=true', () => {
  it('returns 401 when no Bearer token provided', async () => {
    const app = await buildApp(true);
    const res = await app.inject({
      method: 'POST',
      url: '/proxy',
      headers: { 'content-type': 'application/json' },
      payload: { method: 'GET', url: 'https://example.com' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'unauthorized' });
    await app.close();
  });
});

describe('POST /proxy — REQUIRE_AUTH=false with mocked upstream', () => {
  beforeEach(() => {
    // Provide a fake Readable stream body for undici response
    const { Readable } = require('stream');
    mockUndiciRequest.mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'content-length': '13' },
      body: Readable.from(['{"hello":"world"}']),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with X-Upstream-Status header forwarded', async () => {
    const app = await buildApp(false);
    const res = await app.inject({
      method: 'POST',
      url: '/proxy',
      headers: { 'content-type': 'application/json' },
      payload: { method: 'GET', url: 'https://example.com/api' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-upstream-status']).toBe('200');
    expect(mockUndiciRequest).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ method: 'GET' })
    );
    await app.close();
  });
});
