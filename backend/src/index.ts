/**
 * Localman proxy backend — Fastify server entry point.
 * Routes: GET /health (no auth), POST /proxy (optional Firebase auth).
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initFirebaseAdmin } from './auth.js';
import { registerProxy } from './proxy.js';

// Initialise Firebase Admin early if auth is required; no-op otherwise
if (process.env.REQUIRE_AUTH === 'true') {
  initFirebaseAdmin();
}

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:8014,http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  exposedHeaders: [
    'X-Upstream-Status',
    'X-Upstream-Status-Text',
    'X-Upstream-Headers',
    'Content-Type',
    'Content-Length',
  ],
});

app.get('/health', async () => ({ ok: true }));

registerProxy(app);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
