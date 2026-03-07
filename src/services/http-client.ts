/**
 * Execute HTTP requests via Tauri plugin (bypasses CORS). Wraps fetch with timing and response parsing.
 * When not running in Tauri (e.g. browser dev), falls back to global fetch to avoid invoke errors.
 */

import type { ResponseData, Cookie } from '../types/response';
import type { PreparedRequest } from '../types/response';

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
}

async function getFetch(): Promise<typeof fetch> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch;
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
