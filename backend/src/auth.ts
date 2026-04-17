/**
 * Firebase Admin auth initialisation and Fastify preHandler for Bearer token verification.
 * Supports optional auth mode: set REQUIRE_AUTH=false to allow unauthenticated /proxy calls.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import admin from 'firebase-admin';

// Augment FastifyRequest to carry decoded user (or null for anonymous)
declare module 'fastify' {
  interface FastifyRequest {
    user: admin.auth.DecodedIdToken | null;
  }
}

/** Initialise Firebase Admin once when REQUIRE_AUTH=true. Idempotent. */
export function initFirebaseAdmin(): void {
  if (admin.apps.length > 0) return; // already initialised

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || raw.trim() === '') {
    console.error(
      '[auth] REQUIRE_AUTH=true but FIREBASE_SERVICE_ACCOUNT_JSON is missing or empty. Exiting.'
    );
    process.exit(1);
  }

  let parsed: admin.ServiceAccount;
  try {
    parsed = JSON.parse(raw) as admin.ServiceAccount;
  } catch (err) {
    console.error('[auth] Failed to JSON.parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(parsed),
  });
}

/**
 * Fastify preHandler: verifies Firebase ID token from Authorization header.
 * Reads REQUIRE_AUTH at call time so tests can override process.env after module load.
 * When REQUIRE_AUTH=false, skips verification and sets req.user = null.
 */
export async function verifyAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (process.env.REQUIRE_AUTH !== 'true') {
    req.user = null;
    return;
  }

  const authHeader = req.headers.authorization;
  // RFC 7235: scheme is case-insensitive
  if (!authHeader || !/^bearer\s+/i.test(authHeader)) {
    await reply.code(401).send({ error: 'unauthorized', message: 'Missing Bearer token' });
    return;
  }

  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  try {
    req.user = await admin.auth().verifyIdToken(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await reply.code(401).send({ error: 'unauthorized', message: msg });
  }
}
