/**
 * CRUD service for draft requests persisted in IndexedDB.
 * Drafts are unsaved requests that survive app restart.
 */

import { db } from '../database';
import type { ApiRequest } from '../../types/models';

export async function getAll(): Promise<ApiRequest[]> {
  return db.drafts.toArray();
}

export async function save(draft: ApiRequest): Promise<void> {
  await db.drafts.put(draft);
}

export async function remove(id: string): Promise<void> {
  await db.drafts.delete(id);
}

export async function clear(): Promise<void> {
  await db.drafts.clear();
}
