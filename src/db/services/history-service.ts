/**
 * History log, query with filters, clear, and auto-prune.
 */

import { db } from '../database';
import { now } from '../utils';
import type { HistoryEntry } from '../../types/models';

const DEFAULT_HISTORY_LIMIT = 1000;
const RESPONSE_BODY_TRUNCATE = 100 * 1024; // 100KB

export interface HistoryFilter {
  requestId?: string;
  method?: string;
  statusCode?: number;
  /** Status classes: '2'|'3'|'4'|'5' for 2xx, 3xx, 4xx, 5xx (any match) */
  statusRanges?: string[];
  /** URL substring or regex source; match if url includes or matches */
  urlPattern?: string;
  limit?: number;
  offset?: number;
}

function statusInRange(code: number, range: string): boolean {
  const r = range.charAt(0);
  const min = parseInt(r, 10) * 100;
  return code >= min && code < min + 100;
}

function urlMatches(url: string, pattern: string): boolean {
  if (!pattern.trim()) return true;
  try {
    const re = new RegExp(pattern.trim(), 'i');
    return re.test(url);
  } catch {
    return url.toLowerCase().includes(pattern.trim().toLowerCase());
  }
}

export async function add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<number> {
  const withTs: Omit<HistoryEntry, 'id'> = { ...entry, timestamp: now() };
  // Run add + prune atomically so concurrent calls can't exceed the limit
  return db.transaction('rw', db.history, async () => {
    const id = await db.history.add(withTs as HistoryEntry);
    await pruneToLimit(DEFAULT_HISTORY_LIMIT);
    return id;
  });
}

async function pruneToLimit(limit: number): Promise<void> {
  const count = await db.history.count();
  if (count <= limit) return;
  const toRemove = count - limit;
  const oldest = await db.history.orderBy('timestamp').limit(toRemove).primaryKeys();
  await db.history.bulkDelete(oldest);
}

export async function query(filter: HistoryFilter = {}): Promise<HistoryEntry[]> {
  let collection = db.history.orderBy('timestamp').reverse();
  if (filter.requestId) {
    collection = collection.filter(h => h.request_id === filter.requestId);
  }
  if (filter.method) {
    collection = collection.filter(h => h.method === filter.method);
  }
  if (filter.statusCode !== undefined) {
    collection = collection.filter(h => h.status_code === filter.statusCode);
  }
  if (filter.statusRanges?.length) {
    collection = collection.filter(h =>
      filter.statusRanges!.some(r => statusInRange(h.status_code, r))
    );
  }
  if (filter.urlPattern?.trim()) {
    const pattern = filter.urlPattern.trim();
    collection = collection.filter(h => urlMatches(h.url, pattern));
  }
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;
  return collection.offset(offset).limit(limit).toArray();
}

export async function getById(id: number): Promise<HistoryEntry | undefined> {
  return db.history.get(id);
}

export async function clear(): Promise<void> {
  await db.history.clear();
}

export async function clearOlderThan(isoDate: string): Promise<number> {
  const keys = await db.history.where('timestamp').below(isoDate).primaryKeys();
  await db.history.bulkDelete(keys);
  return keys.length;
}

/** Truncate string to at most maxBytes UTF-8 bytes. */
export function truncateBody(body: string, maxBytes: number = RESPONSE_BODY_TRUNCATE): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(body);
  if (encoded.length <= maxBytes) return body;
  const truncated = encoded.slice(0, maxBytes);
  return new TextDecoder().decode(truncated);
}
