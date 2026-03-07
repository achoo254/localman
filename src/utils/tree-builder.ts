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

  function folderHasMatch(folderId: string): boolean {
    if (folders.some(f => f.parent_id === folderId && matchFolder(f))) return true;
    if (requests.some(r => r.folder_id === folderId && matchRequest(r))) return true;
    return folders.filter(f => f.parent_id === folderId).some(f => folderHasMatch(f.id));
  }

  function collectionHasMatch(collectionId: string): boolean {
    if (matchCollection(collections.find(c => c.id === collectionId)!)) return true;
    const rootFolders = folders.filter(f => f.collection_id === collectionId && f.parent_id === null);
    const rootRequests = requests.filter(r => r.collection_id === collectionId && r.folder_id === null);
    if (rootRequests.some(matchRequest)) return true;
    return rootFolders.some(f => matchFolder(f) || folderHasMatch(f.id));
  }

  function buildFolderNodes(collectionId: string, parentId: string | null): TreeNode[] {
    const list = folders
      .filter(f => f.collection_id === collectionId && f.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const out: TreeNode[] = [];
    for (const f of list) {
      if (q && !matchFolder(f) && !folderHasMatch(f.id)) continue;
      const childFolders = buildFolderNodes(collectionId, f.id);
      const childRequests = requests
        .filter(r => r.collection_id === collectionId && r.folder_id === f.id)
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
    const rootRequests = requests
      .filter(r => r.collection_id === c.id && r.folder_id === null)
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
    const requestCount = requests.filter(r => r.collection_id === c.id).length;
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
