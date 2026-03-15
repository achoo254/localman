/**
 * Zustand store for history: entries, filters, load more, clear, re-run.
 */

import { create } from 'zustand';
import type { HistoryEntry } from '../types/models';
import type { HttpMethod } from '../types/enums';
import * as historyService from '../db/services/history-service';
import * as collectionService from '../db/services/collection-service';
import * as requestService from '../db/services/request-service';
import { useRequestStore } from './request-store';

export interface HistoryFilters {
  method?: HttpMethod;
  /** Status classes: '2'|'3'|'4'|'5' for 2xx, 3xx, 4xx, 5xx (multiple allowed) */
  statusRanges?: string[];
  urlPattern?: string;
}

const PAGE_SIZE = 100;

interface HistoryStore {
  entries: HistoryEntry[];
  filters: HistoryFilters;
  selectedEntry: HistoryEntry | null;
  isLoading: boolean;
  hasMore: boolean;

  setFilter: (filters: Partial<HistoryFilters>) => void;
  loadEntries: (append: boolean) => Promise<void>;
  logEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearHistory: () => Promise<void>;
  setSelectedEntry: (entry: HistoryEntry | null) => void;
  rerunEntry: (entry: HistoryEntry) => void;
  cleanupOldHistory: (retentionDays: number) => Promise<number>;
}

function toServiceFilter(f: HistoryFilters, offset: number, limit: number): historyService.HistoryFilter {
  const out: historyService.HistoryFilter = { limit, offset };
  if (f.method) out.method = f.method;
  if (f.statusRanges?.length) out.statusRanges = f.statusRanges;
  if (f.urlPattern) out.urlPattern = f.urlPattern;
  return out;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  filters: {},
  selectedEntry: null,
  isLoading: false,
  hasMore: true,

  setFilter(filters: Partial<HistoryFilters>) {
    set(state => ({ filters: { ...state.filters, ...filters } }));
    void get().loadEntries(false);
  },

  async loadEntries(append: boolean) {
    set({ isLoading: true });
    const { entries, filters } = get();
    const offset = append ? entries.length : 0;
    const filter = toServiceFilter(filters, offset, PAGE_SIZE);
    try {
      const next = await historyService.query(filter);
      set(state => ({
        entries: append ? [...state.entries, ...next] : next,
        hasMore: next.length === PAGE_SIZE,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  async logEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
    try {
      const id = await historyService.add(entry);
      const created: HistoryEntry = {
        ...entry,
        id,
        timestamp: new Date().toISOString(),
      };
      set(state => ({
        entries: [created, ...state.entries].slice(0, PAGE_SIZE),
      }));
    } catch {
      // Fire-and-forget; ignore
    }
  },

  async clearHistory() {
    await historyService.clear();
    set({ entries: [], selectedEntry: null, hasMore: true });
  },

  setSelectedEntry(entry: HistoryEntry | null) {
    set({ selectedEntry: entry });
  },

  async cleanupOldHistory(retentionDays: number) {
    const days = Math.max(0, retentionDays);
    if (days <= 0) return 0;
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const removed = await historyService.clearOlderThan(cutoff.toISOString());
      if (removed > 0) void get().loadEntries(false);
      return removed;
    } catch {
      return 0;
    }
  },

  async rerunEntry(entry: HistoryEntry) {
    const snap = entry.request_snapshot;
    try {
      // RequestSnapshot has no collection_id — always resolve from DB
      const collections = await collectionService.getAll();
      if (!collections.length) {
        set({ selectedEntry: null });
        return;
      }
      const defaultBody = { type: 'none' as const };
      const defaultAuth = { type: 'none' as const };
      const request = await requestService.create({
        collection_id: collections[0].id,
        folder_id: null,
        name: `${entry.method} ${entry.url || 'Request'}`,
        method: snap.method ?? 'GET',
        url: snap.url ?? '',
        params: snap.params ?? [],
        headers: snap.headers ?? [],
        body: snap.body ?? defaultBody,
        auth: snap.auth ?? defaultAuth,
        sort_order: 0,
      });
      useRequestStore.getState().openRequest(request);
      set({ selectedEntry: null });
    } catch {
      set({ selectedEntry: null });
    }
  },
}));
