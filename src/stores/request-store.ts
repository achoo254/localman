/**
 * Zustand store for active request and tab management.
 */

import { create } from 'zustand';
import type { ApiRequest } from '../types/models';
import * as requestService from '../db/services/request-service';

export interface TabInfo {
  id: string;
  name: string;
  method: ApiRequest['method'];
  isDirty: boolean;
  isDraft: boolean;
  prefillCollectionId?: string;
  prefillFolderId?: string | null;
}

interface RequestStore {
  openTabs: TabInfo[];
  activeTabId: string | null;
  activeRequest: ApiRequest | null;
  isDirty: boolean;
  /** Tracks which request id is currently being loaded — used to discard stale loads. */
  _loadingRequestId: string | null;
  /** In-memory draft requests (not persisted to DB until explicit save). */
  drafts: Record<string, ApiRequest>;

  openRequest: (request: ApiRequest) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  setRequestName: (id: string, name: string) => void;
  updateActiveRequest: (partial: Partial<ApiRequest>) => void;
  createNewRequest: (collectionId: string, folderId: string | null) => Promise<ApiRequest>;
  createDraftTab: (prefillCollectionId?: string, prefillFolderId?: string | null) => void;
  saveDraftToCollection: (tabId: string, collectionId: string, folderId: string | null) => Promise<void>;
  saveRequest: () => Promise<void>;
  loadRequest: (id: string | null) => Promise<void>;
}

const defaultBody = { type: 'none' as const };
const defaultAuth = { type: 'none' as const };

export const useRequestStore = create<RequestStore>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  activeRequest: null,
  isDirty: false,
  _loadingRequestId: null,
  drafts: {},

  openRequest(request: ApiRequest) {
    const { openTabs } = get();
    const existing = openTabs.find(t => t.id === request.id);
    if (existing) {
      set({ activeTabId: request.id, activeRequest: request, isDirty: false });
      return;
    }
    const tab: TabInfo = {
      id: request.id,
      name: request.name || 'Untitled',
      method: request.method,
      isDirty: false,
      isDraft: false,
    };
    set({
      openTabs: [...openTabs, tab],
      activeTabId: request.id,
      activeRequest: request,
      isDirty: false,
    });
  },

  closeTab(id: string) {
    const { openTabs, activeTabId, drafts } = get();
    const idx = openTabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const next = openTabs.filter(t => t.id !== id);

    // Clean up draft data if closing a draft tab
    if (drafts[id]) {
      const remainingDrafts = Object.fromEntries(Object.entries(drafts).filter(([k]) => k !== id));
      set({ drafts: remainingDrafts });
    }

    // Fix #1: only update activeRequest when closing the currently active tab
    if (activeTabId !== id) {
      set({ openTabs: next });
      return;
    }

    const nextActiveId = (next[idx] ?? next[idx - 1] ?? null)?.id ?? null;
    set({
      openTabs: next,
      activeTabId: nextActiveId,
      activeRequest: null,
      isDirty: false,
    });
    // Fix #2 (applied here too): load request from DB for the new active tab
    if (nextActiveId) void get().loadRequest(nextActiveId);
  },

  setActiveTab(id: string | null) {
    // Fix #2: clear activeRequest then load from DB
    set({ activeTabId: id, activeRequest: null });
    if (id) void get().loadRequest(id);
  },

  setRequestName(id: string, name: string) {
    const { openTabs, activeRequest } = get();
    const nextTabs = openTabs.map(t => (t.id === id ? { ...t, name } : t));
    set({
      openTabs: nextTabs,
      ...(activeRequest?.id === id ? { activeRequest: { ...activeRequest, name } } : {}),
    });
  },

  updateActiveRequest(partial: Partial<ApiRequest>) {
    const { activeRequest } = get();
    if (!activeRequest) return;
    const updated = { ...activeRequest, ...partial };
    const tab = get().openTabs.find(t => t.id === activeRequest.id);
    const isDraft = tab?.isDraft ?? false;

    set({ activeRequest: updated, isDirty: true });

    // Keep drafts map in sync
    if (isDraft) {
      set({ drafts: { ...get().drafts, [activeRequest.id]: updated } });
    }

    const tabs = get().openTabs.map(t =>
      t.id === activeRequest.id ? { ...t, name: updated.name ?? t.name, method: updated.method, isDirty: true } : t
    );
    set({ openTabs: tabs });
  },

  createDraftTab(prefillCollectionId?: string, prefillFolderId?: string | null) {
    const id = `draft_${crypto.randomUUID()}`;
    const ts = new Date().toISOString();
    const draft: ApiRequest = {
      id,
      collection_id: prefillCollectionId ?? '',
      folder_id: prefillFolderId ?? null,
      name: 'New Request',
      method: 'GET',
      url: '',
      params: [],
      headers: [],
      body: defaultBody,
      auth: defaultAuth,
      sort_order: 0,
      created_at: ts,
      updated_at: ts,
    };
    const tab: TabInfo = {
      id,
      name: 'New Request',
      method: 'GET',
      isDirty: false,
      isDraft: true,
      prefillCollectionId,
      prefillFolderId,
    };
    set({
      drafts: { ...get().drafts, [id]: draft },
      openTabs: [...get().openTabs, tab],
      activeTabId: id,
      activeRequest: draft,
      isDirty: false,
    });
  },

  async saveDraftToCollection(tabId: string, collectionId: string, folderId: string | null) {
    const draft = get().drafts[tabId];
    if (!draft) return;

    const saved = await requestService.create({
      collection_id: collectionId,
      folder_id: folderId,
      name: draft.name,
      method: draft.method,
      url: draft.url,
      params: draft.params,
      headers: draft.headers,
      body: draft.body,
      auth: draft.auth,
      description: draft.description,
      pre_script: draft.pre_script,
      post_script: draft.post_script,
      sort_order: draft.sort_order,
    });

    const remainingDrafts = Object.fromEntries(Object.entries(get().drafts).filter(([k]) => k !== tabId));
    const tabs = get().openTabs.map(t =>
      t.id === tabId
        ? { ...t, id: saved.id, isDraft: false, isDirty: false, prefillCollectionId: undefined, prefillFolderId: undefined }
        : t
    );

    set({
      drafts: remainingDrafts,
      openTabs: tabs,
      activeTabId: get().activeTabId === tabId ? saved.id : get().activeTabId,
      activeRequest: get().activeTabId === tabId ? saved : get().activeRequest,
      isDirty: false,
    });
  },

  async createNewRequest(collectionId: string, folderId: string | null) {
    // Fix #3: let the service generate the ID — pass only data fields
    const request = await requestService.create({
      collection_id: collectionId,
      folder_id: folderId,
      name: 'New Request',
      method: 'GET',
      url: '',
      params: [],
      headers: [],
      body: defaultBody,
      auth: defaultAuth,
      sort_order: 0,
    });
    get().openRequest(request);
    return request;
  },

  async saveRequest() {
    const { activeRequest } = get();
    if (!activeRequest || !get().isDirty) return;
    // Don't save drafts to DB — they're saved explicitly via saveDraftToCollection
    const tab = get().openTabs.find(t => t.id === activeRequest.id);
    if (tab?.isDraft) return;
    // Snapshot before async write — edits made during the DB write are NOT lost
    const snapshot = activeRequest;
    await requestService.update(snapshot.id, snapshot);
    // Only clear dirty flag if no newer edit arrived during the async save
    if (get().activeRequest?.updated_at === snapshot.updated_at) {
      set({ isDirty: false });
      const tabs = get().openTabs.map(t =>
        t.id === snapshot.id ? { ...t, isDirty: false } : t
      );
      set({ openTabs: tabs });
    }
  },

  async loadRequest(id: string | null) {
    if (!id) {
      set({ activeRequest: null, _loadingRequestId: null });
      return;
    }
    // Check drafts first — no DB fetch needed
    const draft = get().drafts[id];
    if (draft) {
      set({ activeRequest: draft, _loadingRequestId: null });
      return;
    }
    // Record which request we're loading — rapid tab switches update this,
    // causing the stale load to discard its result below.
    set({ _loadingRequestId: id });
    const req = await requestService.getById(id);
    // Discard result if another loadRequest call superseded this one
    if (get()._loadingRequestId !== id) return;
    if (req) set({ activeRequest: req });
  },
}));
