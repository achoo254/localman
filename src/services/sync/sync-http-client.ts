/**
 * HTTP client for sync endpoints. Substitutes {filename} in URLs, applies headers and params.
 */

import type { SyncConfig, ServerFileEntry } from '../../types/sync';

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

function buildUrl(template: string, filename: string): string {
  return template.replace(/\{filename\}/g, encodeURIComponent(filename));
}

function applyHeaders(init: RequestInit, headers: SyncConfig['headers']): void {
  const h = new Headers(init.headers);
  for (const { key, value } of headers) {
    if (key.trim()) h.set(key.trim(), value);
  }
  init.headers = h;
}

function applyParams(url: string, params: SyncConfig['params']): string {
  if (!url.trim() || params.length === 0) return url;
  const u = new URL(url, 'http://localhost');
  for (const { key, value } of params) {
    if (key.trim()) u.searchParams.set(key.trim(), value);
  }
  const base = url.split('?')[0] ?? url;
  const qs = u.searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function listFiles(config: SyncConfig): Promise<ServerFileEntry[]> {
  const url = applyParams(config.endpoints.list, config.params);
  const init: RequestInit = { method: 'GET' };
  applyHeaders(init, config.headers);
  const f = await getFetch();
  const res = await f(url, init);
  if (!res.ok) throw new Error(`List failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: unknown) => {
    if (typeof item === 'string') return { filename: item };
    const o = item as Record<string, unknown>;
    return {
      filename: String(o.filename ?? o.name ?? ''),
      updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
    };
  }).filter((e: ServerFileEntry) => e.filename);
}

export async function downloadFile(config: SyncConfig, filename: string): Promise<string> {
  const url = applyParams(buildUrl(config.endpoints.download, filename), config.params);
  const init: RequestInit = { method: 'GET' };
  applyHeaders(init, config.headers);
  const f = await getFetch();
  const res = await f(url, init);
  if (!res.ok) throw new Error(`Download ${filename}: ${res.status}`);
  return res.text();
}

export async function uploadFile(config: SyncConfig, filename: string, body: string): Promise<void> {
  const url = applyParams(buildUrl(config.endpoints.upload, filename), config.params);
  const init: RequestInit = {
    method: 'PUT',
    body,
    headers: { 'Content-Type': 'application/json' },
  };
  applyHeaders(init, config.headers);
  const f = await getFetch();
  const res = await f(url, init);
  if (!res.ok) throw new Error(`Upload ${filename}: ${res.status}`);
}

export async function deleteFile(config: SyncConfig, filename: string): Promise<void> {
  const url = applyParams(buildUrl(config.endpoints.delete, filename), config.params);
  const init: RequestInit = { method: 'DELETE' };
  applyHeaders(init, config.headers);
  const f = await getFetch();
  const res = await f(url, init);
  if (res.status === 404) return;
  if (!res.ok) throw new Error(`Delete ${filename}: ${res.status}`);
}
