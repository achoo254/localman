/**
 * Execute HTTP requests via Tauri plugin (bypasses CORS). Wraps fetch with timing and response parsing.
 * In Tauri: always use plugin-http; do not fallback to browser fetch (would hit CORS).
 * In browser (e.g. pnpm dev): use globalThis.fetch.
 */

import type { ResponseData, Cookie } from '../types/response';
import type { PreparedRequest } from '../types/response';

declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.__TAURI__ ?? window.__TAURI_INTERNALS__);
}

async function getFetch(): Promise<typeof fetch> {
  if (isTauri()) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      return tauriFetch;
    } catch (err) {
      const e = new Error(
        'HTTP plugin unavailable. Request cannot bypass CORS in Tauri. Restart the app or check plugin-http registration.'
      );
      (e as Error & { cause?: unknown }).cause = err;
      throw e;
    }
  }
  return globalThis.fetch.bind(globalThis);
}

const MAX_BODY_DISPLAY = 10 * 1024 * 1024;

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
  const init: RequestInit & { signal?: AbortSignal } = {
    method: prepared.method,
    headers: prepared.headers,
    body: prepared.body,
    signal: options.signal,
  };
  const fetchFn = await getFetch();
  const response = await fetchFn(prepared.url, init);
  const elapsed = Math.round(performance.now() - start);

  const contentType = response.headers.get('content-type') ?? '';
  let body: string;
  const text = await response.text();
  if (text.length > MAX_BODY_DISPLAY) {
    body = text.slice(0, MAX_BODY_DISPLAY) + '\n\n… (truncated)';
  } else {
    body = text;
  }
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
