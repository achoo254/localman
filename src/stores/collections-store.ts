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

  createCollection: (name: string) => Promise<Collection>;
  createFolder: (collectionId: string, parentId: string | null, name: string) => Promise<Folder>;
  renameCollection: (id: string, name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  duplicateRequest: (id: string) => Promise<ApiRequest | undefined>;
  moveRequestToFolder: (requestId: string, folderId: string | null) => Promise<void>;
  moveRequestToCollection: (requestId: string, collectionId: string, folderId: string | null) => Promise<void>;
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

  async createCollection(name: string) {
    const list = await collectionService.getAll();
    const sortOrder = list.length > 0 ? list.reduce((max, c) => c.sort_order > max ? c.sort_order : max, 0) + 1 : 0;
    return collectionService.create({ name, description: '', sort_order: sortOrder });
  },

  async createFolder(collectionId: string, parentId: string | null, name: string) {
    const siblings = await folderService.getChildren(parentId, collectionId);
    const sortOrder = siblings.length > 0 ? siblings.reduce((max, f) => f.sort_order > max ? f.sort_order : max, 0) + 1 : 0;
    return folderService.create({ collection_id: collectionId, parent_id: parentId, name, sort_order: sortOrder });
  },

  async renameCollection(id: string, name: string) {
    await collectionService.update(id, { name });
  },

  async renameFolder(id: string, name: string) {
    await folderService.update(id, { name });
  },

  async deleteCollection(id: string) {
    await collectionService.remove(id);
  },

  async deleteFolder(id: string) {
    await folderService.remove(id);
  },

  async deleteRequest(id: string) {
    await requestService.remove(id);
  },

  async duplicateRequest(id: string) {
    return requestService.duplicate(id);
  },

  async moveRequestToFolder(requestId: string, folderId: string | null) {
    await requestService.moveToFolder(requestId, folderId);
  },

  async moveRequestToCollection(requestId: string, collectionId: string, folderId: string | null) {
    await requestService.moveToCollection(requestId, collectionId, folderId);
  },
}));
