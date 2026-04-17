/**
 * POST /proxy — forwards HTTP requests to upstream using undici.
 * Upstream status/headers are relayed via X-Upstream-* response headers.
 * Always returns HTTP 200 on a successful proxy round-trip; 502 on network failure.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { request as undiciRequest, type Dispatcher } from 'undici';
import { verifyAuth } from './auth.js';

/** Headers that must be stripped before forwarding to prevent protocol issues */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
  'host',
]);

interface ProxyBody {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

const proxyBodySchema = {
  body: {
    type: 'object',
    required: ['method', 'url'],
    properties: {
      method: { type: 'string' },
      url: { type: 'string' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: { type: 'string' },
    },
  },
} as const;

export function registerProxy(app: FastifyInstance): void {
  app.post<{ Body: ProxyBody }>(
    '/proxy',
    { schema: proxyBodySchema, preHandler: verifyAuth },
    async (req: FastifyRequest<{ Body: ProxyBody }>, reply: FastifyReply) => {
      const { method, url, headers = {}, body } = req.body;

      // Validate URL — only http(s) allowed (blocks file://, ftp://, etc.)
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return reply.code(400).send({ error: 'invalid_url', message: 'Malformed URL' });
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return reply.code(400).send({ error: 'invalid_url', message: 'Only http/https protocols are allowed' });
      }

      // Strip hop-by-hop headers
      const forwardHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
          forwardHeaders[key] = value;
        }
      }

      try {
        const upstream = await undiciRequest(url, {
          method: method as Dispatcher.HttpMethod,
          headers: forwardHeaders,
          body: body ?? null,
        });

        // Relay upstream metadata as response headers
        reply.header('X-Upstream-Status', String(upstream.statusCode));
        reply.header('X-Upstream-Status-Text', '');
        reply.header('X-Upstream-Headers', JSON.stringify(upstream.headers));

        // Pass through upstream content-type only.
        // Intentionally DO NOT forward Content-Length — Fastify manages framing
        // for the streamed body; manual CL conflicts with chunked encoding and
        // can corrupt response when upstream uses gzip or undici alters the body.
        const ct = upstream.headers['content-type'];
        if (ct) reply.header('Content-Type', Array.isArray(ct) ? ct[0] : ct);

        reply.code(200);
        // Pipe upstream body stream directly — supports binary payloads
        return reply.send(upstream.body);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.code(502).send({ error: 'upstream_error', message });
      }
    }
  );
}
