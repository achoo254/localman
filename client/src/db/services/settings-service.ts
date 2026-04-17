/**
 * Key-value settings (typed get/set).
 */

import { db } from '../database';
import type { Setting } from '../../types/models';

export async function get<T = unknown>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function set(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function remove(key: string): Promise<void> {
  await db.settings.delete(key);
}

export async function getAll(): Promise<Setting[]> {
  return db.settings.toArray();
}
