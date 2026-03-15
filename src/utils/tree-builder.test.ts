import { describe, it, expect } from 'vitest';
import { buildTree } from './tree-builder';
import type { Collection, Folder, ApiRequest } from '../types/models';

function col(id: string, name: string, sortOrder: number): Collection {
  return {
    id,
    name,
    sort_order: sortOrder,
    created_at: '',
    updated_at: '',
  };
}

function req(id: string, collectionId: string, folderId: string | null, name: string, sortOrder: number): ApiRequest {
  return {
    id,
    collection_id: collectionId,
    folder_id: folderId,
    name,
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
    sort_order: sortOrder,
    created_at: '',
    updated_at: '',
  };
}

describe('tree-builder', () => {
  it('builds flat collection with root requests', () => {
    const collections = [col('c1', 'API', 0)];
    const folders: Folder[] = [];
    const requests = [req('r1', 'c1', null, 'Get users', 0), req('r2', 'c1', null, 'Post', 1)];
    const result = buildTree(collections, folders, requests);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('collection');
    expect(result[0]!.name).toBe('API');
    expect(result[0]!.children).toHaveLength(2);
    expect(result[0]!.children[0]!.type).toBe('request');
    expect(result[0]!.children[0]!.name).toBe('Get users');
  });

  it('filters by search query', () => {
    const collections = [col('c1', 'API', 0)];
    const folders: Folder[] = [];
    const requests = [req('r1', 'c1', null, 'Get users', 0), req('r2', 'c1', null, 'Create item', 1)];
    const result = buildTree(collections, folders, requests, 'Create');
    expect(result).toHaveLength(1);
    expect(result[0]!.children).toHaveLength(1);
    expect(result[0]!.children[0]!.name).toBe('Create item');
  });
});
