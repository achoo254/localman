/**
 * Folder CRUD and tree operations.
 */

import { db } from '../database';
import { newId, now } from '../utils';
import type { Folder } from '../../types/models';

export async function getByCollection(collectionId: string): Promise<Folder[]> {
  return db.folders.where('collection_id').equals(collectionId).sortBy('sort_order');
}

export async function getChildren(parentId: string | null, collectionId: string): Promise<Folder[]> {
  const all = await db.folders.where('collection_id').equals(collectionId).toArray();
  return all.filter(f => f.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
}

export async function getById(id: string): Promise<Folder | undefined> {
  return db.folders.get(id);
}

export async function create(data: Omit<Folder, 'id' | 'created_at' | 'updated_at'>): Promise<Folder> {
  const ts = now();
  const folder: Folder = {
    id: newId(),
    ...data,
    created_at: ts,
    updated_at: ts,
  };
  await db.folders.add(folder);
  return folder;
}

export async function update(id: string, data: Partial<Omit<Folder, 'id' | 'created_at'>>): Promise<Folder> {
  const existing = await db.folders.get(id);
  if (!existing) throw new Error(`Folder not found: ${id}`);
  const updated: Folder = {
    ...existing,
    ...data,
    updated_at: now(),
  };
  await db.folders.put(updated);
  return updated;
}

export async function remove(id: string): Promise<void> {
  const children = await db.folders.where('parent_id').equals(id).toArray();
  for (const child of children) {
    await remove(child.id);
  }
  const requestsInFolder = await db.requests.where('folder_id').equals(id).toArray();
  for (const req of requestsInFolder) {
    await db.requests.update(req.id, { folder_id: null, updated_at: now() });
  }
  await db.folders.delete(id);
}
