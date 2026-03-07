/**
 * History log, query with filters, and clear.
 */

import { db } from '../database';
import { now } from '../utils';
import type { HistoryEntry } from '../../types/models';

export interface HistoryFilter {
  requestId?: string;
  method?: string;
  statusCode?: number;
  limit?: number;
}

export async function add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<number> {
  const withTs: Omit<HistoryEntry, 'id'> = { ...entry, timestamp: now() };
  return db.history.add(withTs as HistoryEntry);
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
  const limit = filter.limit ?? 100;
  return collection.limit(limit).toArray();
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
