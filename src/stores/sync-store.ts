/**
 * Zustand store for cloud sync — entity-level sync with workspace support.
 */

import { create } from 'zustand';
import {
  signIn,
  signUp,
  signOut,
  listWorkspaces,
} from '../services/sync/cloud-auth-client';
import { syncAll } from '../services/sync/entity-sync-service';
import { clearAllPendingChanges } from '../services/sync/offline-change-queue';
import { wsManager, type WsConnectionState } from '../services/sync/websocket-manager';
import { initWsEventHandlers, disposeWsEventHandlers } from '../services/sync/ws-event-handler';
import type { CloudSyncConfig } from '../types/cloud-sync';
import { DEFAULT_CLOUD_SYNC_CONFIG, CLOUD_SYNC_CONFIG_KEY } from '../types/cloud-sync';
import { db } from '../db/database';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
}

interface SyncStore {
  config: CloudSyncConfig;
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
  workspaces: WorkspaceInfo[];
  wsState: WsConnectionState;
  _abort: boolean;

  loadConfig: () => Promise<void>;
  saveConfig: (config: CloudSyncConfig) => Promise<void>;

  // Auth
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;

  // Workspace
  loadWorkspaces: () => Promise<void>;
  subscribeWorkspace: (workspaceId: string) => void;
  unsubscribeWorkspace: (workspaceId: string) => void;

  // Sync
  syncAll: () => Promise<void>;
  cancelSync: () => void;
  clearError: () => void;
}

/** Read cloud sync config from IndexedDB settings */
async function loadCloudConfig(): Promise<CloudSyncConfig> {
  const setting = await db.settings.get(CLOUD_SYNC_CONFIG_KEY);
  return (setting?.value as CloudSyncConfig) ?? { ...DEFAULT_CLOUD_SYNC_CONFIG };
}

/** Persist cloud sync config to IndexedDB settings */
async function persistCloudConfig(config: CloudSyncConfig): Promise<void> {
  await db.settings.put({ key: CLOUD_SYNC_CONFIG_KEY, value: config });
}

/** Cleanup fn for WS state listener — prevents leaks across login/logout */
let wsStateCleanup: (() => void) | null = null;

/** Connect WebSocket and initialize event handlers */
function connectWs(config: CloudSyncConfig): void {
  if (!config.token || !config.serverUrl) return;
  // Clean up previous listener if any
  wsStateCleanup?.();
  wsManager.connect(config.serverUrl, config.token);
  initWsEventHandlers(config);
  // Track WS state in store
  wsStateCleanup = wsManager.onStateChange((wsState) => {
    useSyncStore.setState({ wsState });
  });
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: { ...DEFAULT_CLOUD_SYNC_CONFIG },
  status: 'idle',
  lastSyncAt: null,
  error: null,
  workspaces: [],
  wsState: 'disconnected' as WsConnectionState,
  _abort: false,

  async loadConfig() {
    const config = await loadCloudConfig();
    set({ config, lastSyncAt: config.lastSyncAt });
    // Auto-connect WebSocket if already authenticated
    if (config.token && config.serverUrl) {
      connectWs(config);
    }
  },

  async saveConfig(config: CloudSyncConfig) {
    await persistCloudConfig(config);
    set({ config, lastSyncAt: config.lastSyncAt });
  },

  // --- Auth ---

  async login(email: string, password: string) {
    const { config } = get();
    if (!config.serverUrl) {
      set({ error: 'Server URL is required' });
      return;
    }
    try {
      const result = await signIn(config.serverUrl, email, password);
      const updated: CloudSyncConfig = {
        ...config,
        enabled: true,
        token: result.token,
        userEmail: result.user.email,
        userName: result.user.name,
      };
      await persistCloudConfig(updated);
      set({ config: updated, error: null });
      // Connect WebSocket after successful login
      connectWs(updated);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  async register(name: string, email: string, password: string) {
    const { config } = get();
    if (!config.serverUrl) {
      set({ error: 'Server URL is required' });
      return;
    }
    try {
      const result = await signUp(config.serverUrl, name, email, password);
      const updated: CloudSyncConfig = {
        ...config,
        enabled: true,
        token: result.token,
        userEmail: result.user.email,
        userName: result.user.name,
      };
      await persistCloudConfig(updated);
      set({ config: updated, error: null });
      // Connect WebSocket after successful registration
      connectWs(updated);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  async logout() {
    const { config } = get();
    if (config.token) {
      try {
        await signOut(config.serverUrl, config.token);
      } catch {
        // Best-effort
      }
    }
    // Disconnect WebSocket before clearing state
    wsStateCleanup?.();
    wsStateCleanup = null;
    disposeWsEventHandlers();
    wsManager.disconnect();
    await clearAllPendingChanges();
    const updated: CloudSyncConfig = {
      ...config,
      enabled: false,
      token: null,
      userEmail: null,
      userName: null,
      lastSyncAt: null,
    };
    await persistCloudConfig(updated);
    set({ config: updated, lastSyncAt: null, error: null, workspaces: [] });
  },

  isAuthenticated() {
    return !!get().config.token;
  },

  // --- Workspace ---

  async loadWorkspaces() {
    const { config } = get();
    if (!config.token) return;
    try {
      const workspaces = await listWorkspaces(config.serverUrl, config.token);
      set({ workspaces });
    } catch {
      // Non-blocking
    }
  },

  subscribeWorkspace(workspaceId: string) {
    wsManager.subscribe(`workspace:${workspaceId}`);
  },

  unsubscribeWorkspace(workspaceId: string) {
    wsManager.unsubscribe(`workspace:${workspaceId}`);
  },

  // --- Sync ---

  async syncAll() {
    const { config } = get();
    if (!config.token) {
      set({ status: 'error', error: 'Not authenticated. Please login first.' });
      return;
    }
    set({ status: 'syncing', error: null, _abort: false });

    try {
      const result = await syncAll(config, null);
      if (get()._abort) return;

      const updated: CloudSyncConfig = {
        ...config,
        lastSyncAt: result.serverTime,
      };
      await persistCloudConfig(updated);

      set({
        config: updated,
        status: result.errors.length ? 'error' : 'idle',
        error: result.errors.length ? result.errors.join('; ') : null,
        lastSyncAt: updated.lastSyncAt,
      });
    } catch (e) {
      if (get()._abort) return;
      set({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  cancelSync() {
    set({ _abort: true });
  },

  clearError() {
    set({ error: null, status: 'idle' });
  },
}));
