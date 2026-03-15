/**
 * Execute HTTP requests via Tauri plugin (bypasses CORS). Wraps fetch with timing and response parsing.
 * In Tauri: calls IPC directly to avoid browser Headers API dropping forbidden headers (Cookie, Host).
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

/** Tauri IPC response shape from plugin:http|fetch_send */
interface TauriFetchSendResult {
  status: number;
  statusText: string;
  url: string;
  headers: [string, string][];
  rid: number;
}

/**
 * Execute fetch via Tauri IPC directly, bypassing plugin's JS wrapper.
 * The plugin wrapper uses `new Headers()` which silently drops forbidden headers
 * like Cookie, Host per the browser Fetch spec. By calling invoke() directly,
 * we serialize headers as string[][] and send them straight to the Rust HTTP client.
 */
async function tauriFetchDirect(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }
): Promise<Response> {
  const { invoke } = await import('@tauri-apps/api/core');

  if (init.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

  // Serialize headers as [key, value][] — no browser Headers filtering
  const headersArray = Object.entries(init.headers);

  // Encode body as byte array for IPC
  let data: number[] | null = null;
  if (init.body) {
    data = Array.from(new TextEncoder().encode(init.body));
  }

  const rid = await invoke<number>('plugin:http|fetch', {
    clientConfig: { method: init.method, url, headers: headersArray, data },
  });

  const abort = () => invoke('plugin:http|fetch_cancel', { rid });
  if (init.signal?.aborted) { void abort(); throw new DOMException('The operation was aborted.', 'AbortError'); }
  init.signal?.addEventListener('abort', () => void abort());

  const { status, statusText, url: responseUrl, headers: responseHeaders, rid: responseRid } =
    await invoke<TauriFetchSendResult>('plugin:http|fetch_send', { rid });

  const dropBody = () => invoke('plugin:http|fetch_cancel_body', { rid: responseRid });

  // Read body chunks until the plugin signals end (last byte === 1)
  const chunks: Uint8Array[] = [];
  for (;;) {
    if (init.signal?.aborted) { void dropBody(); throw new DOMException('The operation was aborted.', 'AbortError'); }
    const chunk = await invoke<number[]>('plugin:http|fetch_read_body', { rid: responseRid });
    const arr = new Uint8Array(chunk);
    const lastByte = arr[arr.byteLength - 1];
    const actual = arr.slice(0, arr.byteLength - 1);
    if (actual.byteLength > 0) chunks.push(actual);
    if (lastByte === 1) break;
  }

  // Combine chunks into a single Uint8Array
  const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const bodyBytes = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) { bodyBytes.set(c, offset); offset += c.byteLength; }

  const res = new Response(bodyBytes, { status, statusText });
  Object.defineProperty(res, 'url', { value: responseUrl });
  Object.defineProperty(res, 'headers', { value: new Headers(responseHeaders) });
  return res;
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

  let response: Response;
  if (isTauri()) {
    // Use direct IPC to preserve all headers (Cookie, Host, etc.)
    response = await tauriFetchDirect(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      signal: options.signal,
    });
  } else {
    // Browser mode: use standard fetch
    response = await globalThis.fetch(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      signal: options.signal,
    });
  }
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
