/**
 * Request CRUD, duplicate, and move.
 */

import { db } from '../database';
import { newId, now } from '../utils';
import type { ApiRequest } from '../../types/models';

export async function getByCollection(collectionId: string): Promise<ApiRequest[]> {
  return db.requests.where('collection_id').equals(collectionId).sortBy('sort_order');
}

export async function getByFolder(folderId: string | null, collectionId: string): Promise<ApiRequest[]> {
  const all = await db.requests.where('collection_id').equals(collectionId).toArray();
  return all.filter(r => r.folder_id === folderId).sort((a, b) => a.sort_order - b.sort_order);
}

export async function getById(id: string): Promise<ApiRequest | undefined> {
  return db.requests.get(id);
}

export async function create(data: Omit<ApiRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ApiRequest> {
  const ts = now();
  const request: ApiRequest = {
    id: newId(),
    ...data,
    created_at: ts,
    updated_at: ts,
  };
  await db.requests.add(request);
  return request;
}

export async function update(id: string, data: Partial<Omit<ApiRequest, 'id' | 'created_at'>>): Promise<ApiRequest> {
  const existing = await db.requests.get(id);
  if (!existing) throw new Error(`Request not found: ${id}`);
  const updated: ApiRequest = {
    ...existing,
    ...data,
    updated_at: now(),
  };
  await db.requests.put(updated);
  return updated;
}

export async function remove(id: string): Promise<void> {
  await db.requests.delete(id);
}

export async function duplicate(id: string): Promise<ApiRequest> {
  const existing = await db.requests.get(id);
  if (!existing) throw new Error(`Request not found: ${id}`);
  const ts = now();
  const copy: ApiRequest = {
    ...existing,
    id: newId(),
    name: `${existing.name} (copy)`,
    created_at: ts,
    updated_at: ts,
  };
  await db.requests.add(copy);
  return copy;
}

export async function moveToFolder(requestId: string, folderId: string | null): Promise<ApiRequest> {
  return update(requestId, { folder_id: folderId });
}

export async function moveToCollection(requestId: string, collectionId: string, folderId: string | null): Promise<ApiRequest> {
  return update(requestId, { collection_id: collectionId, folder_id: folderId });
}
