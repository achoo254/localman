/**
 * Zustand store for cloud sync: config, status, progress, syncAll trigger.
 */

import { create } from 'zustand';
import {
  getSyncConfig,
  saveSyncConfig,
  syncAll as runSyncAll,
  deleteCollectionOnServer,
} from '../services/sync/sync-service';
import type { SyncConfig } from '../types/sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncStore {
  config: SyncConfig | null;
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
  progress: { current: number; total: number } | null;
  _abort: boolean;

  loadConfig: () => Promise<void>;
  setConfig: (config: SyncConfig) => Promise<void>;
  syncAll: () => Promise<void>;
  testConnection: () => Promise<{ ok: boolean; count?: number; error?: string }>;
  cancelSync: () => void;
  clearError: () => void;
  deleteOnServer: (collectionId: string) => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: null,
  status: 'idle',
  lastSyncAt: null,
  error: null,
  progress: null,
  _abort: false,

  async loadConfig() {
    const config = await getSyncConfig();
    set({ config, lastSyncAt: config.lastSyncAt });
  },

  async setConfig(config: SyncConfig) {
    await saveSyncConfig(config);
    set({ config, lastSyncAt: config.lastSyncAt });
  },

  async syncAll() {
    const config = get().config;
    if (!config?.enabled || !config.endpoints.list) {
      set({ status: 'error', error: 'Sync not configured or disabled' });
      return;
    }
    set({ status: 'syncing', error: null, _abort: false });
    try {
      const result = await runSyncAll(config);
      if (get()._abort) return;
      const updated = await getSyncConfig();
      set({
        config: updated,
        status: result.errors.length ? 'error' : 'idle',
        error: result.errors.length ? result.errors.join('; ') : null,
        lastSyncAt: updated.lastSyncAt ?? new Date().toISOString(),
        progress: null,
      });
    } catch (e) {
      if (get()._abort) return;
      set({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
        progress: null,
      });
    }
  },

  async testConnection() {
    const config = get().config;
    if (!config?.endpoints.list) return { ok: false, error: 'List URL required' };
    try {
      const { listFiles } = await import('../services/sync/sync-http-client');
      const files = await listFiles(config);
      return { ok: true, count: files.length };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  cancelSync() {
    set({ _abort: true });
  },

  clearError() {
    set({ error: null, status: 'idle' });
  },

  async deleteOnServer(collectionId: string) {
    const config = get().config;
    if (!config?.enabled) return;
    try {
      await deleteCollectionOnServer(config, collectionId);
    } catch {
      // best-effort; don't block user
    }
  },
}));
