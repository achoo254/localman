/**
 * Zustand store for cloud sync: supports both legacy endpoint-based
 * and new Better Auth pull/push sync modes.
 */

import { create } from 'zustand';
import {
  getSyncConfig,
  saveSyncConfig,
  syncAll as runLegacySyncAll,
  deleteCollectionOnServer,
} from '../services/sync/sync-service';
import {
  getCloudSyncConfig,
  saveCloudSyncConfig,
  cloudSyncAll,
  checkServerHealth,
} from '../services/sync/cloud-sync-service';
import {
  signIn,
  signUp,
  signOut,
} from '../services/sync/cloud-auth-client';
import type { SyncConfig } from '../types/sync';
import type { CloudSyncConfig } from '../types/cloud-sync';
import { DEFAULT_CLOUD_SYNC_CONFIG } from '../types/cloud-sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';
export type SyncMode = 'legacy' | 'cloud';

interface SyncStore {
  // Legacy sync (4-endpoint model)
  config: SyncConfig | null;
  // Cloud sync (Better Auth + pull/push)
  cloudConfig: CloudSyncConfig;
  mode: SyncMode;

  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
  progress: { current: number; total: number } | null;
  _abort: boolean;

  loadConfig: () => Promise<void>;
  setConfig: (config: SyncConfig) => Promise<void>;
  setCloudConfig: (config: CloudSyncConfig) => Promise<void>;
  setMode: (mode: SyncMode) => void;

  // Auth actions (cloud mode)
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;

  // Sync actions
  syncAll: () => Promise<void>;
  testConnection: () => Promise<{ ok: boolean; count?: number; error?: string }>;
  cancelSync: () => void;
  clearError: () => void;
  deleteOnServer: (collectionId: string) => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: null,
  cloudConfig: { ...DEFAULT_CLOUD_SYNC_CONFIG },
  mode: 'cloud',
  status: 'idle',
  lastSyncAt: null,
  error: null,
  progress: null,
  _abort: false,

  async loadConfig() {
    const [config, cloudConfig] = await Promise.all([
      getSyncConfig(),
      getCloudSyncConfig(),
    ]);
    set({
      config,
      cloudConfig,
      lastSyncAt: cloudConfig.lastSyncAt ?? config.lastSyncAt,
    });
  },

  async setConfig(config: SyncConfig) {
    await saveSyncConfig(config);
    set({ config, lastSyncAt: config.lastSyncAt });
  },

  async setCloudConfig(cloudConfig: CloudSyncConfig) {
    await saveCloudSyncConfig(cloudConfig);
    set({ cloudConfig, lastSyncAt: cloudConfig.lastSyncAt });
  },

  setMode(mode: SyncMode) {
    set({ mode });
  },

  // --- Auth ---

  async login(email: string, password: string) {
    const { cloudConfig } = get();
    if (!cloudConfig.serverUrl) {
      set({ error: 'Server URL is required' });
      return;
    }
    try {
      const result = await signIn(cloudConfig.serverUrl, email, password);
      const updated: CloudSyncConfig = {
        ...cloudConfig,
        enabled: true,
        token: result.token,
        userEmail: result.user.email,
        userName: result.user.name,
      };
      await saveCloudSyncConfig(updated);
      set({ cloudConfig: updated, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  async register(name: string, email: string, password: string) {
    const { cloudConfig } = get();
    if (!cloudConfig.serverUrl) {
      set({ error: 'Server URL is required' });
      return;
    }
    try {
      const result = await signUp(cloudConfig.serverUrl, name, email, password);
      const updated: CloudSyncConfig = {
        ...cloudConfig,
        enabled: true,
        token: result.token,
        userEmail: result.user.email,
        userName: result.user.name,
      };
      await saveCloudSyncConfig(updated);
      set({ cloudConfig: updated, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  async logout() {
    const { cloudConfig } = get();
    if (cloudConfig.token) {
      try {
        await signOut(cloudConfig.serverUrl, cloudConfig.token);
      } catch {
        // Best-effort sign out
      }
    }
    const updated: CloudSyncConfig = {
      ...cloudConfig,
      enabled: false,
      token: null,
      userEmail: null,
      userName: null,
      lastSyncAt: null,
    };
    await saveCloudSyncConfig(updated);
    set({ cloudConfig: updated, lastSyncAt: null, error: null });
  },

  isAuthenticated() {
    return !!get().cloudConfig.token;
  },

  // --- Sync ---

  async syncAll() {
    const { mode, config, cloudConfig } = get();
    set({ status: 'syncing', error: null, _abort: false });

    try {
      if (mode === 'cloud') {
        if (!cloudConfig.token) {
          set({ status: 'error', error: 'Not authenticated. Please login first.' });
          return;
        }
        const result = await cloudSyncAll(cloudConfig);
        if (get()._abort) return;
        const updated = await getCloudSyncConfig();
        set({
          cloudConfig: updated,
          status: result.errors.length ? 'error' : 'idle',
          error: result.errors.length ? result.errors.join('; ') : null,
          lastSyncAt: updated.lastSyncAt,
          progress: null,
        });
      } else {
        // Legacy mode
        if (!config?.enabled || !config.endpoints.list) {
          set({ status: 'error', error: 'Sync not configured or disabled' });
          return;
        }
        const result = await runLegacySyncAll(config);
        if (get()._abort) return;
        const updated = await getSyncConfig();
        set({
          config: updated,
          status: result.errors.length ? 'error' : 'idle',
          error: result.errors.length ? result.errors.join('; ') : null,
          lastSyncAt: updated.lastSyncAt ?? new Date().toISOString(),
          progress: null,
        });
      }
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
    const { mode, config, cloudConfig } = get();
    if (mode === 'cloud') {
      if (!cloudConfig.serverUrl) return { ok: false, error: 'Server URL required' };
      return checkServerHealth(cloudConfig.serverUrl);
    }
    // Legacy
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
    const { config } = get();
    if (!config?.enabled) return;
    try {
      await deleteCollectionOnServer(config, collectionId);
    } catch {
      // best-effort
    }
  },
}));
