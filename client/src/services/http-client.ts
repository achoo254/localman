/**
 * Execute HTTP requests via browser fetch.
 * - Localhost URLs → direct fetch (no proxy, no token)
 * - Remote URLs → POST to /proxy with upstream credentials
 */

import type { ResponseData, Cookie } from '../types/response';
import type { PreparedRequest } from '../types/response';
import { toast } from '../components/common/toast-provider';

const MAX_BODY_DISPLAY = 10 * 1024 * 1024;

/** Returns true for loopback / local hostnames */
function isLocalHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    // URL parser strips brackets from IPv6 hostnames, so '::1' alone covers '[::1]'
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
    return localHosts.has(host) || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

function parseSetCookie(header: string): Cookie {
  const parts = header.split(';').map(s => s.trim());
  const [nameVal] = parts;
  const eq = nameVal?.indexOf('=') ?? -1;
  const name = eq >= 0 ? nameVal!.slice(0, eq).trim() : '';
  const value = eq >= 0 ? nameVal!.slice(eq + 1).trim() : nameVal ?? '';
  const cookie: Cookie = { name, value };
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]!;
    const idx = p.indexOf('=');
    const key = (idx >= 0 ? p.slice(0, idx) : p).trim().toLowerCase();
    const val = idx >= 0 ? p.slice(idx + 1).trim() : '';
    if (key === 'domain') cookie.domain = val;
    else if (key === 'path') cookie.path = val;
    else if (key === 'expires') cookie.expires = val;
    else if (key === 'httponly') cookie.httpOnly = true;
    else if (key === 'secure') cookie.secure = true;
  }
  return cookie;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function getCookiesFromHeaders(headers: Headers): Cookie[] {
  const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  if (setCookies.length > 0) return setCookies.map(parseSetCookie);
  const cookieHeader = headers.get('set-cookie');
  if (!cookieHeader) return [];
  return [parseSetCookie(cookieHeader)];
}

export interface ExecuteOptions {
  signal?: AbortSignal;
}

export async function executeHttp(
  prepared: PreparedRequest,
  options: ExecuteOptions = {}
): Promise<ResponseData> {
  const start = performance.now();

  if (isLocalHost(prepared.url)) {
    // Direct fetch for localhost — no proxy, no auth token
    const response = await globalThis.fetch(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      signal: options.signal,
    });
    const elapsed = Math.round(performance.now() - start);

    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    const body = text.length > MAX_BODY_DISPLAY ? text.slice(0, MAX_BODY_DISPLAY) + '\n\n… (truncated)' : text;
    const bodySize = new Blob([text]).size;

    if (response.ok || response.status > 0) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app:network-success'));
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: headersToRecord(response.headers),
      cookies: getCookiesFromHeaders(response.headers),
      body,
      bodySize,
      responseTime: elapsed,
      contentType,
    };
  }

  // Remote URL — route through proxy
  const proxyUrl = (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:3001/proxy';

  // Lazily get auth token — firebase-auth not wired until Phase 04
  let token: string | null;
  try {
    const firebaseAuth = await import('./firebase-auth');
    token = await firebaseAuth.getCurrentIdToken();
  } catch {
    // Not yet available — proceed without auth
    token = null;
  }

  const proxyHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    proxyHeaders['Authorization'] = `Bearer ${token}`;
  }

  let proxyResponse: Response;
  try {
    proxyResponse = await globalThis.fetch(proxyUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({
        method: prepared.method,
        url: prepared.url,
        headers: prepared.headers,
        body: prepared.body,
      }),
      signal: options.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const proxyError = new Error(`Proxy unreachable: ${msg}. Ensure the backend is running at ${proxyUrl}.`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proxyError as any).cause = err;
    throw proxyError;
  }

  if (proxyResponse.status === 401) {
    toast('Sign in required', {
      description: 'Sign in with Google in Settings → Account to call remote APIs.',
      variant: 'error',
    });
    throw new Error('Proxy returned 401: authentication required. Sign in via Settings → Account.');
  }

  if (proxyResponse.status === 502) {
    throw new Error('Proxy returned 502: upstream server is down or unreachable.');
  }

  const elapsed = Math.round(performance.now() - start);

  // Upstream metadata forwarded as response headers by the proxy
  const upstreamStatus = parseInt(proxyResponse.headers.get('X-Upstream-Status') ?? '0', 10) || proxyResponse.status;
  const upstreamStatusText = proxyResponse.headers.get('X-Upstream-Status-Text') ?? proxyResponse.statusText;
  const upstreamHeadersRaw = proxyResponse.headers.get('X-Upstream-Headers');
  let upstreamHeaders: Record<string, string> = {};
  if (upstreamHeadersRaw) {
    try {
      upstreamHeaders = JSON.parse(upstreamHeadersRaw) as Record<string, string>;
    } catch {
      // Malformed header — ignore
    }
  }

  // Read body as binary for full fidelity then decode as text
  const arrayBuffer = await proxyResponse.arrayBuffer();
  const rawText = new TextDecoder().decode(arrayBuffer);
  const body = rawText.length > MAX_BODY_DISPLAY ? rawText.slice(0, MAX_BODY_DISPLAY) + '\n\n… (truncated)' : rawText;
  const bodySize = arrayBuffer.byteLength;

  const contentType = upstreamHeaders['content-type'] ?? upstreamHeaders['Content-Type'] ?? '';

  // Build cookie objects from upstream set-cookie header
  const upstreamHeadersObj = new Headers(upstreamHeaders);
  const cookies = getCookiesFromHeaders(upstreamHeadersObj);

  if (upstreamStatus > 0) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('app:network-success'));
    }
  }

  return {
    status: upstreamStatus,
    statusText: upstreamStatusText,
    headers: upstreamHeaders,
    cookies,
    body,
    bodySize,
    responseTime: elapsed,
    contentType,
  };
}
