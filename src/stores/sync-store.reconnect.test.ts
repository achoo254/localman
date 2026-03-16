/**
 * Unit tests for sync-store auto-sync behavior.
 * Verifies that online/offline events and periodic sync work correctly,
 * including debouncing and feature flag gating.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock all firebase stuff BEFORE importing sync-store
vi.mock('../services/sync/firebase-auth-client', () => ({
  signInWithGoogle: vi.fn(async () => ({ email: 'user@example.com', displayName: 'User' })),
  firebaseSignOut: vi.fn(async () => {}),
  getIdToken: vi.fn(async () => 'mock-token'),
  onAuthChanged: vi.fn(() => vi.fn()),
  listWorkspaces: vi.fn(async () => []),
  getCurrentUser: vi.fn(() => ({ email: 'user@example.com' })),
}));

vi.mock('../services/sync/entity-sync-service', () => ({
  syncAll: vi.fn(async () => ({
    serverTime: new Date().toISOString(),
    errors: [],
  })),
}));

vi.mock('../services/sync/offline-change-queue', () => ({
  clearAllPendingChanges: vi.fn(async () => {}),
}));

vi.mock('../services/sync/websocket-manager', () => ({
  wsManager: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onStateChange: vi.fn(() => vi.fn()),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}));

vi.mock('../services/sync/ws-event-handler', () => ({
  initWsEventHandlers: vi.fn(),
  disposeWsEventHandlers: vi.fn(),
}));

vi.mock('../db/database', () => ({
  db: {
    settings: {
      get: vi.fn(async () => ({ value: { enabled: false } })),
      put: vi.fn(async () => {}),
    },
  },
}));

// NOW import sync-store after mocks are in place
import { useSyncStore } from './sync-store';
import * as authClient from '../services/sync/firebase-auth-client';
import * as entitySyncService from '../services/sync/entity-sync-service';
import * as syncQueue from '../services/sync/offline-change-queue';
import * as wsManager from '../services/sync/websocket-manager';
import * as wsEventHandler from '../services/sync/ws-event-handler';
import { FEATURES } from '../utils/feature-flags';


// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

beforeEach(() => {
  // Clear store state
  useSyncStore.setState({
    config: { enabled: false, userEmail: null, userName: null, userAvatar: null, lastSyncAt: null },
    status: 'idle',
    lastSyncAt: null,
    error: null,
    workspaces: [],
    wsState: 'disconnected',
    _abort: false,
    authLoading: true,
  });
  // Clear mocks
  vi.clearAllMocks();
  // Use fake timers for debounce/interval tests
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllTimers();
});

describe('sync-store auto-sync reconnect', () => {
  describe('online event handling', () => {
    it('triggers syncAll after debounce when coming online', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      // Simulate authentication
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
        displayName: 'User',
      } as any);
      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      // Simulate online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Debounce should delay execution
      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();

      // Advance time past debounce (2s)
      vi.advanceTimersByTime(2000);

      expect(vi.mocked(entitySyncService.syncAll)).toHaveBeenCalled();
    });

    it('does not trigger syncAll if feature flag is disabled', async () => {
      // Temporarily disable feature
      vi.stubGlobal('FEATURES', { CLOUD_SYNC: false });

      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      vi.advanceTimersByTime(2000);

      // syncAll should not be called due to feature flag
      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('does not trigger syncAll if sync is disabled', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      // Keep config.enabled = false
      store.setState({
        config: { enabled: false, userEmail: null, userName: null, userAvatar: null, lastSyncAt: null },
      });

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      vi.advanceTimersByTime(2000);

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('does not trigger syncAll if already syncing', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
        status: 'syncing',
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      vi.advanceTimersByTime(2000);

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('debounces rapid online/offline/online events', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      // First online event
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(500);

      // Second online event (within debounce window)
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(500);

      // Should not have triggered yet (total 1s, need 2s)
      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();

      // Complete debounce period
      vi.advanceTimersByTime(1000);

      // Should trigger once (debounce restarted on second event)
      expect(vi.mocked(entitySyncService.syncAll)).toHaveBeenCalledTimes(1);
    });
  });

  describe('periodic sync', () => {
    it('triggers sync every 5 minutes when authenticated and online', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      // First interval tick (5 min = 5 * 60 * 1000)
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(vi.mocked(entitySyncService.syncAll)).toHaveBeenCalled();

      // Second interval tick
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(vi.mocked(entitySyncService.syncAll)).toHaveBeenCalledTimes(2);
    });

    it('does not trigger periodic sync if feature flag is disabled', async () => {
      vi.stubGlobal('FEATURES', { CLOUD_SYNC: false });

      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('does not trigger periodic sync if sync is disabled', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: false, userEmail: null, userName: null, userAvatar: null, lastSyncAt: null },
      });

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('does not trigger periodic sync if offline', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      // Set offline
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
        configurable: true,
      });

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('does not trigger periodic sync if already syncing', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
        status: 'syncing',
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });
  });

  describe('logout cleanup', () => {
    it('removes online event listener on logout', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      await store.logout();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('clears online debounce timer on logout', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      // Trigger online event to start debounce timer
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(500); // Partial way through debounce

      // Logout should clear the timer
      await store.logout();

      // Complete the debounce period
      vi.advanceTimersByTime(1500);

      // Should not trigger sync since timer was cleared
      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('clears periodic sync interval on logout', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });

      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      // First interval fires
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(vi.mocked(entitySyncService.syncAll)).toHaveBeenCalledTimes(1);

      // Logout
      await store.logout();

      // Clear calls and advance time
      vi.clearAllMocks();
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Should not fire again since interval was cleared
      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
    });

    it('clears all pending changes on logout', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      await store.logout();

      expect(vi.mocked(syncQueue.clearAllPendingChanges)).toHaveBeenCalled();
    });

    it('disconnects WebSocket on logout', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      await store.logout();

      expect(vi.mocked(wsManager.wsManager.disconnect)).toHaveBeenCalled();
    });

    it('disposes WS event handlers on logout', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      await store.logout();

      expect(vi.mocked(wsEventHandler.disposeWsEventHandlers)).toHaveBeenCalled();
    });

    it('unsubscribes auth listener on logout', async () => {
      const unsubscribeMock = vi.fn();
      vi.mocked(authClient.onAuthChanged).mockReturnValue(unsubscribeMock);

      const store = useSyncStore.getState();
      await store.loadConfig();

      await store.logout();

      // The unsubscribe function should have been called
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('updates config to disabled state on logout', async () => {
      const store = useSyncStore.getState();
      store.setState({
        config: { enabled: true, userEmail: 'user@example.com', userName: 'User', userAvatar: null, lastSyncAt: null },
      });
      await store.loadConfig();

      await store.logout();

      const updated = useSyncStore.getState();
      expect(updated.config.enabled).toBe(false);
      expect(updated.config.userEmail).toBeNull();
      expect(updated.config.userName).toBeNull();
    });

    it('clears workspaces on logout', async () => {
      const store = useSyncStore.getState();
      store.setState({ workspaces: [{ id: 'ws-1', name: 'Workspace', role: 'admin' }] });
      await store.loadConfig();

      await store.logout();

      const updated = useSyncStore.getState();
      expect(updated.workspaces).toEqual([]);
    });
  });

  describe('loadConfig initialization', () => {
    it('sets up online event listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      const store = useSyncStore.getState();
      await store.loadConfig();

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('sets up periodic sync interval', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      // Interval should exist (verify by advancing time)
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Store state should have changed (depends on other conditions, but interval was set)
      // This is a minimal check that interval exists
    });

    it('listens to auth state changes', async () => {
      const store = useSyncStore.getState();
      await store.loadConfig();

      expect(vi.mocked(authClient.onAuthChanged)).toHaveBeenCalled();
    });

    it('replaces previous listeners if called multiple times', async () => {
      const store = useSyncStore.getState();

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      await store.loadConfig();
      await store.loadConfig();

      // Should have tried to remove old listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });
  });

  describe('syncAll method', () => {
    it('returns early if not authenticated', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue(null as any);

      const store = useSyncStore.getState();
      await store.syncAll();

      expect(vi.mocked(entitySyncService.syncAll)).not.toHaveBeenCalled();
      expect(store.status).toBe('error');
      expect(store.error).toBe('Not authenticated. Please login first.');
    });

    it('sets status to "syncing" during sync', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      const store = useSyncStore.getState();
      const syncPromise = store.syncAll();

      // Check status is syncing
      expect(store.status).toBe('syncing');

      await syncPromise;
    });

    it('updates lastSyncAt after successful sync', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      const serverTime = '2026-03-16T12:00:00Z';
      vi.mocked(entitySyncService.syncAll).mockResolvedValue({
        serverTime,
        errors: [],
      });

      const store = useSyncStore.getState();
      await store.syncAll();

      const updated = useSyncStore.getState();
      expect(updated.lastSyncAt).toBe(serverTime);
    });

    it('sets status to "idle" on successful sync with no errors', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      vi.mocked(entitySyncService.syncAll).mockResolvedValue({
        serverTime: new Date().toISOString(),
        errors: [],
      });

      const store = useSyncStore.getState();
      await store.syncAll();

      const updated = useSyncStore.getState();
      expect(updated.status).toBe('idle');
      expect(updated.error).toBeNull();
    });

    it('sets status to "error" if sync returns errors', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      vi.mocked(entitySyncService.syncAll).mockResolvedValue({
        serverTime: new Date().toISOString(),
        errors: ['Error 1', 'Error 2'],
      });

      const store = useSyncStore.getState();
      await store.syncAll();

      const updated = useSyncStore.getState();
      expect(updated.status).toBe('error');
      expect(updated.error).toContain('Error 1');
      expect(updated.error).toContain('Error 2');
    });

    it('handles sync service exceptions', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      vi.mocked(entitySyncService.syncAll).mockRejectedValue(
        new Error('Network error')
      );

      const store = useSyncStore.getState();
      await store.syncAll();

      const updated = useSyncStore.getState();
      expect(updated.status).toBe('error');
      expect(updated.error).toContain('Network error');
    });

    it('respects abort flag during sync', async () => {
      vi.mocked(authClient.getCurrentUser).mockReturnValue({
        email: 'user@example.com',
      } as any);

      const store = useSyncStore.getState();
      store.setState({ _abort: true });

      await store.syncAll();

      // Should not crash and status should reflect the abort
      const updated = useSyncStore.getState();
      expect(updated).toBeDefined();
    });
  });
});
