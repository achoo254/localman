/**
 * Zustand store for sidebar: expanded state, search, and CRUD actions.
 * Tree data comes from useLiveQuery + tree-builder (see use-collection-tree).
 */

import { create } from 'zustand';
import * as collectionService from '../db/services/collection-service';
import * as folderService from '../db/services/folder-service';
import * as requestService from '../db/services/request-service';
import * as settingsService from '../db/services/settings-service';
import type { Collection, Folder, ApiRequest } from '../types/models';
import { addPendingChange } from '../services/sync/offline-change-queue';

const EXPANDED_KEY = 'sidebar_expanded';

async function loadExpandedAsync(): Promise<Set<string>> {
  const raw = await settingsService.get<string[]>(EXPANDED_KEY);
  return new Set(raw ?? []);
}

async function saveExpanded(ids: Set<string>): Promise<void> {
  await settingsService.set(EXPANDED_KEY, Array.from(ids));
}

interface CollectionsStore {
  searchQuery: string;
  expandedIds: Set<string>;

  setSearch: (query: string) => void;
  toggleExpand: (id: string) => void;
  setExpanded: (ids: Set<string>) => void;
  hydrateExpanded: () => Promise<void>;

  createCollection: (name: string, workspaceId?: string | null) => Promise<Collection>;
  createFolder: (collectionId: string, parentId: string | null, name: string) => Promise<Folder>;
  renameCollection: (id: string, name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  duplicateRequest: (id: string) => Promise<ApiRequest | undefined>;
  renameRequest: (id: string, name: string) => Promise<void>;
  moveRequestToFolder: (requestId: string, folderId: string | null) => Promise<void>;
  moveRequestToCollection: (requestId: string, collectionId: string, folderId: string | null) => Promise<void>;
  moveCollectionToWorkspace: (collectionId: string, workspaceId: string | null) => Promise<void>;
}

/** Queue a sync change if the entity belongs to a synced collection or workspace */
async function queueSyncChange(
  entityType: 'collection' | 'folder' | 'request',
  entityId: string,
  action: 'create' | 'update' | 'delete',
  changes: Record<string, unknown>,
  version: number = 1,
  workspaceId: string | null = null,
): Promise<void> {
  try {
    await addPendingChange(entityType, entityId, action, changes, version, workspaceId);
  } catch {
    // Non-blocking — sync queue failure shouldn't break the UI
  }
}

export const useCollectionsStore = create<CollectionsStore>((set, get) => ({
  searchQuery: '',
  // Fix #4: start with empty Set; hydrateExpanded() is called on app init (e.g. in App.tsx)
  expandedIds: new Set<string>(),

  setSearch(query: string) {
    set({ searchQuery: query });
  },

  toggleExpand(id: string) {
    const { expandedIds } = get();
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ expandedIds: next });
    void saveExpanded(next);
  },

  setExpanded(ids: Set<string>) {
    set({ expandedIds: ids });
    void saveExpanded(ids);
  },

  // Fix #4: hydrateExpanded loads from DB and must be called once on app mount
  async hydrateExpanded() {
    try {
      const ids = await loadExpandedAsync();
      set({ expandedIds: ids });
    } catch {
      set({ expandedIds: new Set() });
    }
  },

  async createCollection(name: string, workspaceId?: string | null) {
    const list = await collectionService.getAll();
    const sortOrder = list.length > 0 ? list.reduce((max, c) => c.sort_order > max ? c.sort_order : max, 0) + 1 : 0;
    const result = await collectionService.create({ name, description: '', sort_order: sortOrder, workspace_id: workspaceId ?? null });
    void queueSyncChange('collection', result.id, 'create', { name }, result.version ?? 1, result.workspace_id ?? null);
    return result;
  },

  async createFolder(collectionId: string, parentId: string | null, name: string) {
    const siblings = await folderService.getChildren(parentId, collectionId);
    const sortOrder = siblings.length > 0 ? siblings.reduce((max, f) => f.sort_order > max ? f.sort_order : max, 0) + 1 : 0;
    const result = await folderService.create({ collection_id: collectionId, parent_id: parentId, name, sort_order: sortOrder });
    void queueSyncChange('folder', result.id, 'create', { collection_id: collectionId, parent_id: parentId, name }, result.version ?? 1);
    return result;
  },

  async renameCollection(id: string, name: string) {
    await collectionService.update(id, { name });
    void queueSyncChange('collection', id, 'update', { name });
  },

  async renameFolder(id: string, name: string) {
    await folderService.update(id, { name });
    void queueSyncChange('folder', id, 'update', { name });
  },

  async deleteCollection(id: string) {
    await collectionService.remove(id);
    void queueSyncChange('collection', id, 'delete', {});
  },

  async deleteFolder(id: string) {
    await folderService.remove(id);
    void queueSyncChange('folder', id, 'delete', {});
  },

  async deleteRequest(id: string) {
    await requestService.remove(id);
    void queueSyncChange('request', id, 'delete', {});
  },

  async duplicateRequest(id: string) {
    const result = await requestService.duplicate(id);
    if (result) {
      void queueSyncChange('request', result.id, 'create', { name: result.name, collection_id: result.collection_id }, result.version ?? 1);
    }
    return result;
  },

  async renameRequest(id: string, name: string) {
    await requestService.update(id, { name });
    void queueSyncChange('request', id, 'update', { name });
  },

  async moveRequestToFolder(requestId: string, folderId: string | null) {
    await requestService.moveToFolder(requestId, folderId);
    void queueSyncChange('request', requestId, 'update', { folder_id: folderId });
  },

  async moveRequestToCollection(requestId: string, collectionId: string, folderId: string | null) {
    await requestService.moveToCollection(requestId, collectionId, folderId);
    void queueSyncChange('request', requestId, 'update', { collection_id: collectionId, folder_id: folderId });
  },

  async moveCollectionToWorkspace(collectionId: string, workspaceId: string | null) {
    await collectionService.update(collectionId, { workspace_id: workspaceId });
    void queueSyncChange('collection', collectionId, 'update', { workspace_id: workspaceId });
  },
}));
