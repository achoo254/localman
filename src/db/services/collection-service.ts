/**
 * Collection CRUD and cascade delete.
 */

import { db } from '../database';
import { newId, now } from '../utils';
import type { Collection } from '../../types/models';

export async function getAll(): Promise<Collection[]> {
  return db.collections.orderBy('sort_order').toArray();
}

export async function getById(id: string): Promise<Collection | undefined> {
  return db.collections.get(id);
}

export async function create(data: Omit<Collection, 'id' | 'created_at' | 'updated_at'>): Promise<Collection> {
  const ts = now();
  const isDefaultName = !data.name || data.name === 'Untitled Collection' || data.name === 'New Collection' || data.name === 'Default';
  const baseName = isDefaultName ? (data.name || 'Untitled Collection') : data.name;
  let finalName = baseName;

  if (isDefaultName) {
    const existing = await db.collections.toArray();
    const sameNameCount = existing.filter(c => c.name === baseName || c.name.startsWith(`${baseName} `)).length;
    if (sameNameCount > 0) {
      finalName = `${baseName} ${sameNameCount + 1}`;
    }
  }

  const collection: Collection = {
    id: newId(),
    ...data,
    name: finalName,
    created_at: ts,
    updated_at: ts,
  };
  await db.collections.add(collection);
  return collection;
}

export async function update(id: string, data: Partial<Omit<Collection, 'id' | 'created_at'>>): Promise<Collection> {
  const existing = await db.collections.get(id);
  if (!existing) throw new Error(`Collection not found: ${id}`);
  const updated: Collection = {
    ...existing,
    ...data,
    updated_at: now(),
  };
  await db.collections.put(updated);
  return updated;
}

export async function remove(id: string): Promise<void> {
  // Single atomic transaction: cascade delete folders, requests, then collection
  await db.transaction('rw', [db.collections, db.folders, db.requests], async () => {
    const folderIds = await db.folders.where('collection_id').equals(id).primaryKeys();
    await db.folders.bulkDelete(folderIds);
    const requestIds = await db.requests.where('collection_id').equals(id).primaryKeys();
    await db.requests.bulkDelete(requestIds);
    await db.collections.delete(id);
  });
}
