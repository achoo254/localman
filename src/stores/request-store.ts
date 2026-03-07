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
}

interface RequestStore {
  openTabs: TabInfo[];
  activeTabId: string | null;
  activeRequest: ApiRequest | null;
  isDirty: boolean;

  openRequest: (request: ApiRequest) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  updateActiveRequest: (partial: Partial<ApiRequest>) => void;
  createNewRequest: (collectionId: string, folderId: string | null) => Promise<ApiRequest>;
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
    };
    set({
      openTabs: [...openTabs, tab],
      activeTabId: request.id,
      activeRequest: request,
      isDirty: false,
    });
  },

  closeTab(id: string) {
    const { openTabs, activeTabId } = get();
    const idx = openTabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const next = openTabs.filter(t => t.id !== id);

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

  updateActiveRequest(partial: Partial<ApiRequest>) {
    const { activeRequest } = get();
    if (!activeRequest) return;
    const updated = { ...activeRequest, ...partial };
    set({ activeRequest: updated, isDirty: true });
    const tabs = get().openTabs.map(t =>
      t.id === activeRequest.id ? { ...t, name: updated.name ?? t.name, method: updated.method, isDirty: true } : t
    );
    set({ openTabs: tabs });
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
    await requestService.update(activeRequest.id, activeRequest);
    set({ isDirty: false });
    const tabs = get().openTabs.map(t =>
      t.id === activeRequest.id ? { ...t, isDirty: false } : t
    );
    set({ openTabs: tabs });
  },

  async loadRequest(id: string | null) {
    if (!id) {
      set({ activeRequest: null });
      return;
    }
    const req = await requestService.getById(id);
    if (req) set({ activeRequest: req });
  },
}));
