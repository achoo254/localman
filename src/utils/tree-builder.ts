/**
 * Build nested tree from flat collections, folders, requests.
 * Sort by sort_order at each level. Filter by search (show matching + ancestors).
 */

import type { Collection, Folder, ApiRequest } from '../types/models';
import type { HttpMethod } from '../types/enums';

export interface TreeNode {
  id: string;
  type: 'collection' | 'folder' | 'request';
  name: string;
  method?: HttpMethod;
  children: TreeNode[];
  sortOrder: number;
  collectionId: string;
  folderId: string | null;
  requestCount?: number;
}

export function buildTree(
  collections: Collection[],
  folders: Folder[],
  requests: ApiRequest[],
  searchQuery?: string
): TreeNode[] {
  const q = (searchQuery ?? '').trim().toLowerCase();
  const matchRequest = (r: ApiRequest) =>
    !q || r.name.toLowerCase().includes(q) || (r.url && r.url.toLowerCase().includes(q));
  const matchFolder = (f: Folder) => !q || f.name.toLowerCase().includes(q);
  const matchCollection = (c: Collection) => !q || c.name.toLowerCase().includes(q);

  // Pre-build O(1) lookup maps to avoid O(n²/n³) re-scanning inside recursion

  // childFolders: parentId → Folder[]  (null key = root-level folders)
  const childFoldersByParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parent_id;
    const arr = childFoldersByParent.get(key) ?? [];
    arr.push(f);
    childFoldersByParent.set(key, arr);
  }
  // requestsByFolder: folderId → ApiRequest[], '__root__' sentinel for top-level
  const requestsByFolder = new Map<string, ApiRequest[]>();
  // requestCountByCollection: collectionId → total request count
  const requestCountByCollection = new Map<string, number>();
  for (const r of requests) {
    const folderKey = r.folder_id ?? '__root__';
    const arr = requestsByFolder.get(folderKey) ?? [];
    arr.push(r);
    requestsByFolder.set(folderKey, arr);
    requestCountByCollection.set(r.collection_id, (requestCountByCollection.get(r.collection_id) ?? 0) + 1);
  }

  function folderHasMatch(folderId: string): boolean {
    const childFolders = childFoldersByParent.get(folderId) ?? [];
    if (childFolders.some(f => matchFolder(f))) return true;
    const childRequests = requestsByFolder.get(folderId) ?? [];
    if (childRequests.some(r => matchRequest(r))) return true;
    return childFolders.some(f => folderHasMatch(f.id));
  }

  function collectionHasMatch(collectionId: string): boolean {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return false;
    if (matchCollection(collection)) return true;
    const rootFolders = (childFoldersByParent.get(null) ?? []).filter(
      f => f.collection_id === collectionId
    );
    const rootRequests = (requestsByFolder.get('__root__') ?? []).filter(
      r => r.collection_id === collectionId
    );
    if (rootRequests.some(matchRequest)) return true;
    return rootFolders.some(f => matchFolder(f) || folderHasMatch(f.id));
  }

  function buildFolderNodes(collectionId: string, parentId: string | null): TreeNode[] {
    const list = (childFoldersByParent.get(parentId) ?? [])
      .filter(f => f.collection_id === collectionId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const out: TreeNode[] = [];
    for (const f of list) {
      if (q && !matchFolder(f) && !folderHasMatch(f.id)) continue;
      const childFolders = buildFolderNodes(collectionId, f.id);
      const childRequests = (requestsByFolder.get(f.id) ?? [])
        .filter(r => r.collection_id === collectionId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const reqNodes: TreeNode[] = [];
      for (const r of childRequests) {
        if (q && !matchRequest(r)) continue;
        reqNodes.push({
          id: r.id,
          type: 'request',
          name: r.name,
          method: r.method,
          children: [],
          sortOrder: r.sort_order,
          collectionId,
          folderId: f.id,
        });
      }
      out.push({
        id: f.id,
        type: 'folder',
        name: f.name,
        children: [...childFolders, ...reqNodes].sort((a, b) => a.sortOrder - b.sortOrder),
        sortOrder: f.sort_order,
        collectionId,
        folderId: f.id,
      });
    }
    return out;
  }

  const result: TreeNode[] = [];
  const sorted = [...collections].sort((a, b) => a.sort_order - b.sort_order);
  for (const c of sorted) {
    if (q && !collectionHasMatch(c.id)) continue;
    const rootFolders = buildFolderNodes(c.id, null);
    const rootRequests = (requestsByFolder.get('__root__') ?? [])
      .filter(r => r.collection_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const rootReqNodes: TreeNode[] = [];
    for (const r of rootRequests) {
      if (q && !matchRequest(r)) continue;
      rootReqNodes.push({
        id: r.id,
        type: 'request',
        name: r.name,
        method: r.method,
        children: [],
        sortOrder: r.sort_order,
        collectionId: c.id,
        folderId: null,
      });
    }
    const requestCount = requestCountByCollection.get(c.id) ?? 0;
    result.push({
      id: c.id,
      type: 'collection',
      name: c.name,
      children: [...rootFolders, ...rootReqNodes].sort((a, b) => a.sortOrder - b.sortOrder),
      sortOrder: c.sort_order,
      collectionId: c.id,
      folderId: null,
      requestCount,
    });
  }
  return result;
}
