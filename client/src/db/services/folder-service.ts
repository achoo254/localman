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
  if (parentId === null) {
    // null is not a valid IndexedDB key — filter root folders via collection_id index
    const all = await db.folders.where('collection_id').equals(collectionId).toArray();
    return all.filter(f => f.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);
  }
  // Use compound index [collection_id+parent_id] for non-root folders
  const results = await db.folders
    .where('[collection_id+parent_id]')
    .equals([collectionId, parentId])
    .toArray();
  return results.sort((a, b) => a.sort_order - b.sort_order);
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
  // Single atomic transaction: recursively collect all descendant folder IDs,
  // delete all their requests, then delete all folders including this one.
  await db.transaction('rw', [db.folders, db.requests], async () => {
    const allFolders = await db.folders.toArray();

    // Collect IDs of this folder and all descendants via BFS
    const toDelete: string[] = [];
    const queue: string[] = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      toDelete.push(current);
      const children = allFolders.filter(f => f.parent_id === current);
      for (const child of children) queue.push(child.id);
    }

    // Delete all requests belonging to any folder in the subtree
    const requestIds = await db.requests.where('folder_id').anyOf(toDelete).primaryKeys();
    await db.requests.bulkDelete(requestIds);

    // Delete all folders in the subtree
    await db.folders.bulkDelete(toDelete);
  });
}
