/**
 * Environment CRUD and active toggle.
 */

import { db } from '../database';
import { newId, now } from '../utils';
import type { Environment } from '../../types/models';

export async function getAll(): Promise<Environment[]> {
  return db.environments.toArray();
}

export async function getById(id: string): Promise<Environment | undefined> {
  return db.environments.get(id);
}

export async function getActive(): Promise<Environment | undefined> {
  // Boolean fields are not valid IndexedDB index keys — filter in JS
  const all = await db.environments.toArray();
  return all.find(e => e.is_active);
}

export async function create(data: Omit<Environment, 'id' | 'created_at' | 'updated_at'>): Promise<Environment> {
  const ts = now();
  const env: Environment = {
    id: newId(),
    ...data,
    created_at: ts,
    updated_at: ts,
  };
  await db.environments.add(env);
  return env;
}

export async function update(id: string, data: Partial<Omit<Environment, 'id' | 'created_at'>>): Promise<Environment> {
  const existing = await db.environments.get(id);
  if (!existing) throw new Error(`Environment not found: ${id}`);
  const updated: Environment = {
    ...existing,
    ...data,
    updated_at: now(),
  };
  await db.environments.put(updated);
  return updated;
}

export async function remove(id: string): Promise<void> {
  await db.environments.delete(id);
}

export async function setActive(id: string): Promise<void> {
  await db.transaction('rw', db.environments, async () => {
    const all = await db.environments.toArray();
    const ts = now();
    // Single bulkPut instead of N individual update() calls
    const updated: Environment[] = all.map(e => ({
      ...e,
      is_active: e.id === id,
      updated_at: ts,
    }));
    await db.environments.bulkPut(updated);
  });
}
