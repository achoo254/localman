/**
 * Zustand store for cloud sync — entity-level sync with workspace support.
 * Uses Firebase Auth for authentication (Google Login).
 */

import { create } from 'zustand'
import {
  signInWithGoogle,
  firebaseSignOut,
  getIdToken,
  onAuthChanged,
  listWorkspaces,
  getCurrentUser,
} from '../services/sync/firebase-auth-client'
import { syncAll } from '../services/sync/entity-sync-service'
import { clearAllPendingChanges } from '../services/sync/offline-change-queue'
import { wsManager, type WsConnectionState } from '../services/sync/websocket-manager'
import { initWsEventHandlers, disposeWsEventHandlers } from '../services/sync/ws-event-handler'
import { FEATURES } from '../utils/feature-flags'
import type { CloudSyncConfig } from '../types/cloud-sync'
import { DEFAULT_CLOUD_SYNC_CONFIG, CLOUD_SYNC_CONFIG_KEY } from '../types/cloud-sync'
import { db } from '../db/database'

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface WorkspaceInfo {
  id: string
  name: string
  role: string
}

interface SyncStore {
  config: CloudSyncConfig
  status: SyncStatus
  lastSyncAt: string | null
  error: string | null
  workspaces: WorkspaceInfo[]
  wsState: WsConnectionState
  _abort: boolean
  authLoading: boolean

  loadConfig: () => Promise<void>
  saveConfig: (config: CloudSyncConfig) => Promise<void>

  // Auth
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: () => boolean

  // Workspace
  loadWorkspaces: () => Promise<void>
  subscribeWorkspace: (workspaceId: string) => void
  unsubscribeWorkspace: (workspaceId: string) => void

  // Sync
  syncAll: () => Promise<void>
  cancelSync: () => void
  clearError: () => void
}

/** Read cloud sync config from IndexedDB settings */
async function loadCloudConfig(): Promise<CloudSyncConfig> {
  const setting = await db.settings.get(CLOUD_SYNC_CONFIG_KEY)
  return (setting?.value as CloudSyncConfig) ?? { ...DEFAULT_CLOUD_SYNC_CONFIG }
}

/** Persist cloud sync config to IndexedDB settings */
async function persistCloudConfig(config: CloudSyncConfig): Promise<void> {
  await db.settings.put({ key: CLOUD_SYNC_CONFIG_KEY, value: config })
}

/** Cleanup fn for WS state listener */
let wsStateCleanup: (() => void) | null = null
let authUnsubscribe: (() => void) | null = null
/** Cleanup refs for auto-sync */
let onlineHandler: (() => void) | null = null
let periodicSyncInterval: ReturnType<typeof setInterval> | null = null
let onlineDebounceTimer: ReturnType<typeof setTimeout> | null = null

const AUTO_SYNC_DEBOUNCE_MS = 2000
const PERIODIC_SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/** Connect WebSocket using Firebase token */
async function connectWs(config: CloudSyncConfig): Promise<void> {
  const token = await getIdToken()
  if (!token) return
  wsStateCleanup?.()
  wsManager.connect(token)
  initWsEventHandlers(config)
  wsStateCleanup = wsManager.onStateChange((wsState) => {
    useSyncStore.setState({ wsState })
  })
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: { ...DEFAULT_CLOUD_SYNC_CONFIG },
  status: 'idle',
  lastSyncAt: null,
  error: null,
  workspaces: [],
  wsState: 'disconnected' as WsConnectionState,
  _abort: false,
  authLoading: true,

  async loadConfig() {
    const config = await loadCloudConfig()
    set({ config, lastSyncAt: config.lastSyncAt })

    // Listen for Firebase auth state changes
    authUnsubscribe?.()
    authUnsubscribe = onAuthChanged(async (user) => {
      if (user) {
        const updated: CloudSyncConfig = {
          ...get().config,
          enabled: true,
          userEmail: user.email,
          userName: user.displayName,
          userAvatar: user.photoURL,
        }
        await persistCloudConfig(updated)
        set({ config: updated, authLoading: false })
        // Auto-connect WS
        void connectWs(updated)
      } else {
        set({ authLoading: false })
      }
    })

    // Auto-sync on reconnect: debounced online listener
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    onlineHandler = () => {
      if (!FEATURES.CLOUD_SYNC) return
      const { config: cfg, status } = get()
      if (cfg.enabled && status !== 'syncing') {
        if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer)
        onlineDebounceTimer = setTimeout(() => {
          onlineDebounceTimer = null
          void get().syncAll()
        }, AUTO_SYNC_DEBOUNCE_MS)
      }
    }
    window.addEventListener('online', onlineHandler)

    // Periodic sync every 5 min when authenticated and online
    if (periodicSyncInterval) clearInterval(periodicSyncInterval)
    periodicSyncInterval = setInterval(() => {
      if (!FEATURES.CLOUD_SYNC) return
      const { config: cfg, status } = get()
      if (cfg.enabled && status !== 'syncing' && navigator.onLine) {
        void get().syncAll()
      }
    }, PERIODIC_SYNC_INTERVAL_MS)
  },

  async saveConfig(config: CloudSyncConfig) {
    await persistCloudConfig(config)
    set({ config, lastSyncAt: config.lastSyncAt })
  },

  // --- Auth ---

  async loginWithGoogle() {
    try {
      set({ error: null, authLoading: true })
      const user = await signInWithGoogle()
      const { config } = get()
      const updated: CloudSyncConfig = {
        ...config,
        enabled: true,
        userEmail: user.email,
        userName: user.displayName,
        userAvatar: user.photoURL,
      }
      await persistCloudConfig(updated)
      set({ config: updated, error: null, authLoading: false })
      // Connect WS
      void connectWs(updated)
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        authLoading: false,
      })
    }
  },

  async logout() {
    try {
      await firebaseSignOut()
    } catch {
      // Best-effort
    }
    // Unsubscribe auth listener
    authUnsubscribe?.()
    authUnsubscribe = null
    // Clean up auto-sync listeners
    if (onlineHandler) { window.removeEventListener('online', onlineHandler); onlineHandler = null }
    if (onlineDebounceTimer) { clearTimeout(onlineDebounceTimer); onlineDebounceTimer = null }
    if (periodicSyncInterval) { clearInterval(periodicSyncInterval); periodicSyncInterval = null }
    // Disconnect WebSocket
    wsStateCleanup?.()
    wsStateCleanup = null
    disposeWsEventHandlers()
    wsManager.disconnect()
    await clearAllPendingChanges()
    const { config } = get()
    const updated: CloudSyncConfig = {
      ...config,
      enabled: false,
      userEmail: null,
      userName: null,
      userAvatar: null,
      lastSyncAt: null,
    }
    await persistCloudConfig(updated)
    set({ config: updated, lastSyncAt: null, error: null, workspaces: [] })
  },

  isAuthenticated() {
    return !!getCurrentUser()
  },

  // --- Workspace ---

  async loadWorkspaces() {
    if (!getCurrentUser()) return
    try {
      const workspaces = await listWorkspaces()
      set({ workspaces })
    } catch {
      // Non-blocking
    }
  },

  subscribeWorkspace(workspaceId: string) {
    wsManager.subscribe(`workspace:${workspaceId}`)
  },

  unsubscribeWorkspace(workspaceId: string) {
    wsManager.unsubscribe(`workspace:${workspaceId}`)
  },

  // --- Sync ---

  async syncAll() {
    if (!getCurrentUser()) {
      set({ status: 'error', error: 'Not authenticated. Please login first.' })
      return
    }
    set({ status: 'syncing', error: null, _abort: false })

    try {
      const { config } = get()
      const result = await syncAll(config, null)
      if (get()._abort) return

      const updated: CloudSyncConfig = {
        ...config,
        lastSyncAt: result.serverTime,
      }
      await persistCloudConfig(updated)

      set({
        config: updated,
        status: result.errors.length ? 'error' : 'idle',
        error: result.errors.length ? result.errors.join('; ') : null,
        lastSyncAt: updated.lastSyncAt,
      })
    } catch (e) {
      if (get()._abort) return
      set({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  },

  cancelSync() {
    set({ _abort: true })
  },

  clearError() {
    set({ error: null, status: 'idle' })
  },
}))
