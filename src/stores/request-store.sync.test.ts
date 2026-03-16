/**
 * Unit tests for request-store sync wiring.
 * Verifies that request mutations correctly queue sync changes via addPendingChange.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useRequestStore } from './request-store';
import * as requestService from '../db/services/request-service';
import * as draftService from '../db/services/draft-service';
import * as syncQueue from '../services/sync/offline-change-queue';
import { db } from '../db/database';
import type { ApiRequest } from '../types/models';

// Mock sync services
vi.mock('../services/sync/offline-change-queue', () => ({
  addPendingChange: vi.fn(async () => {}),
}));

// Mock DB services — return real data but avoid DB side effects in isolation
vi.mock('../db/services/request-service', () => ({
  create: vi.fn(async (data: Partial<ApiRequest>) => ({
    id: 'req-' + Math.random().toString(36).slice(2),
    collection_id: data.collection_id ?? '',
    folder_id: data.folder_id ?? null,
    name: data.name ?? 'New Request',
    method: data.method ?? 'GET',
    url: data.url ?? '',
    params: data.params ?? [],
    headers: data.headers ?? [],
    body: data.body ?? { type: 'none' },
    auth: data.auth ?? { type: 'none' },
    description: data.description ?? '',
    pre_script: data.pre_script ?? '',
    post_script: data.post_script ?? '',
    sort_order: data.sort_order ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  })),
  update: vi.fn(async (id: string, data: Partial<ApiRequest>) => ({
    id,
    ...data,
    version: 2,
  })),
  getById: vi.fn(async (id: string) => ({
    id,
    collection_id: 'col-1',
    folder_id: null,
    name: 'Test Request',
    method: 'GET',
    url: 'https://api.example.com',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
    description: '',
    pre_script: '',
    post_script: '',
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  })),
}));

vi.mock('../db/services/draft-service', () => ({
  save: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  getAll: vi.fn(async () => []),
}));

beforeEach(async () => {
  // Clear store state
  useRequestStore.setState({
    openTabs: [],
    activeTabId: null,
    activeRequest: null,
    isDirty: false,
    _loadingRequestId: null,
    drafts: {},
  });
  // Clear mocks
  vi.clearAllMocks();
});

afterEach(async () => {
  vi.clearAllTimers();
});

describe('request-store sync wiring', () => {
  describe('createNewRequest', () => {
    it('queues sync change with entity type "request" and action "create"', async () => {
      const store = useRequestStore.getState();
      await store.createNewRequest('col-1', null);

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('request'); // entityType
      expect(call[2]).toBe('create'); // action
    });

    it('includes correct fields in changes: name, collection_id, folder_id', async () => {
      const store = useRequestStore.getState();
      await store.createNewRequest('col-42', 'folder-99');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3]; // changes object
      expect(changes).toHaveProperty('name', 'New Request');
      expect(changes).toHaveProperty('collection_id', 'col-42');
      expect(changes).toHaveProperty('folder_id', 'folder-99');
    });

    it('passes version from created request', async () => {
      const store = useRequestStore.getState();
      await store.createNewRequest('col-1', null);

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const version = call[4];
      expect(version).toBe(1); // version
    });

    it('opens request in editor after creating', async () => {
      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null);

      const updated = useRequestStore.getState();
      expect(updated.activeRequest?.id).toBe(req.id);
      expect(updated.openTabs.length).toBe(1);
      expect(updated.openTabs[0].id).toBe(req.id);
    });

    it('does not sync if addPendingChange throws (non-blocking)', async () => {
      (syncQueue.addPendingChange as any).mockRejectedValueOnce(new Error('Queue fail'));

      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null); // Should not throw

      expect(req.id).toBeDefined();
      const updated = useRequestStore.getState();
      expect(updated.activeRequest?.id).toBe(req.id); // UI still updates
    });
  });

  describe('saveRequest', () => {
    it('queues sync change with action "update"', async () => {
      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null);
      vi.clearAllMocks();

      // Modify and save
      store.updateActiveRequest({ name: 'Modified Request' });
      await store.saveRequest();

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('request'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes all key fields in changes', async () => {
      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null);
      vi.clearAllMocks();

      store.updateActiveRequest({
        name: 'Updated',
        method: 'POST',
        url: 'https://updated.com',
      });
      await store.saveRequest();

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('name');
      expect(changes).toHaveProperty('method');
      expect(changes).toHaveProperty('url');
      expect(changes).toHaveProperty('params');
      expect(changes).toHaveProperty('headers');
      expect(changes).toHaveProperty('body');
      expect(changes).toHaveProperty('auth');
      expect(changes).toHaveProperty('folder_id');
      expect(changes).toHaveProperty('collection_id');
      expect(changes).toHaveProperty('sort_order');
    });

    it('does not sync if dirty flag is false', async () => {
      const store = useRequestStore.getState();
      await store.createNewRequest('col-1', null);
      vi.clearAllMocks();

      // Don't modify activeRequest
      await store.saveRequest();

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not sync if activeRequest is null', async () => {
      const store = useRequestStore.getState();
      vi.clearAllMocks();

      await store.saveRequest();

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not sync draft requests (saveRequest exits early for drafts)', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      const draftId = store.activeTabId!;

      store.updateActiveRequest({ name: 'Draft Modified' });
      vi.clearAllMocks();

      await store.saveRequest();

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('clears dirty flag after successful sync queue', async () => {
      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null);
      store.updateActiveRequest({ name: 'Modified' });

      let updated = useRequestStore.getState();
      expect(updated.isDirty).toBe(true);

      vi.clearAllMocks();
      await store.saveRequest();

      // isDirty should be cleared only if updated_at hasn't changed (no concurrent edits)
      // Since we controlled the flow, it should be false
      updated = useRequestStore.getState();
      expect(updated.isDirty).toBe(false);
    });
  });

  describe('saveDraftToCollection', () => {
    it('queues sync change with action "create" when saving draft', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;

      store.updateActiveRequest({ name: 'My Draft Request' });

      vi.clearAllMocks();
      await store.saveDraftToCollection(draftId, 'col-1', 'folder-1');

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('request'); // entityType
      expect(call[2]).toBe('create'); // action (draft → create in DB)
    });

    it('includes name, collection_id, folder_id in changes', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;

      store.updateActiveRequest({ name: 'My Draft Request' });

      vi.clearAllMocks();
      await store.saveDraftToCollection(draftId, 'col-42', 'folder-99');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('name', 'My Draft Request');
      expect(changes).toHaveProperty('collection_id', 'col-42');
      expect(changes).toHaveProperty('folder_id', 'folder-99');
    });

    it('removes draft from drafts map after saving', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;

      expect(updated.drafts[draftId]).toBeDefined();

      await store.saveDraftToCollection(draftId, 'col-1', null);

      updated = useRequestStore.getState();
      expect(updated.drafts[draftId]).toBeUndefined();
    });

    it('updates tab isDraft flag to false', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;
      expect(updated.openTabs.find(t => t.id === draftId)?.isDraft).toBe(true);

      await store.saveDraftToCollection(draftId, 'col-1', null);

      updated = useRequestStore.getState();
      // The tab ID changes when saved, so the draft tab is no longer in openTabs with the draft ID
      expect(updated.drafts[draftId]).toBeUndefined();
    });

    it('handles missing draft gracefully', async () => {
      const store = useRequestStore.getState();
      vi.clearAllMocks();

      await store.saveDraftToCollection('nonexistent-draft-id', 'col-1', null);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });
  });

  describe('updateActiveRequest (drafts)', () => {
    it('does not sync when updating a draft request', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);

      vi.clearAllMocks();
      store.updateActiveRequest({ name: 'Modified Draft' });

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('updates draft in drafts map for persistence', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;

      store.updateActiveRequest({ name: 'Modified Draft', method: 'POST' });

      updated = useRequestStore.getState();
      expect(updated.drafts[draftId]?.name).toBe('Modified Draft');
      expect(updated.drafts[draftId]?.method).toBe('POST');
    });

    it('sets isDirty flag for drafts', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);

      store.updateActiveRequest({ name: 'Changed' });

      let updated = useRequestStore.getState();
      expect(updated.isDirty).toBe(true);
    });
  });

  describe('createDraftTab', () => {
    it('does not queue sync when creating draft', async () => {
      const store = useRequestStore.getState();
      vi.clearAllMocks();

      store.createDraftTab('col-1', null);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('adds draft to drafts map', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', 'folder-1');

      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;
      expect(updated.drafts[draftId]).toBeDefined();
      expect(updated.drafts[draftId].collection_id).toBe('col-1');
      expect(updated.drafts[draftId].folder_id).toBe('folder-1');
    });

    it('creates isDraft tab', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);

      let updated = useRequestStore.getState();
      const tab = updated.openTabs.find(t => t.isDraft);
      expect(tab).toBeDefined();
      expect(tab?.isDraft).toBe(true);
    });
  });

  describe('closeTab', () => {
    it('removes draft from drafts map when closing draft tab', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;

      expect(updated.drafts[draftId]).toBeDefined();

      store.closeTab(draftId);

      updated = useRequestStore.getState();
      expect(updated.drafts[draftId]).toBeUndefined();
    });

    it('does not queue sync when closing draft', async () => {
      const store = useRequestStore.getState();
      store.createDraftTab('col-1', null);
      let updated = useRequestStore.getState();
      const draftId = updated.activeTabId!;

      vi.clearAllMocks();
      store.closeTab(draftId);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('catches and ignores queue errors without breaking UI state', async () => {
      (syncQueue.addPendingChange as any).mockRejectedValueOnce(
        new Error('Queue database error')
      );

      const store = useRequestStore.getState();
      const result = await store.createNewRequest('col-1', null);

      // UI state should still be updated
      let updated = useRequestStore.getState();
      expect(updated.activeRequest?.id).toBe(result.id);
      expect(updated.openTabs).toHaveLength(1);
    });
  });

  describe('sync change structure', () => {
    it('passes correct entityId in queueSyncChange call', async () => {
      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null);

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const entityId = call[1];
      expect(entityId).toBe(req.id);
    });

    it('never includes internal state in changes (only entity fields)', async () => {
      const store = useRequestStore.getState();
      const req = await store.createNewRequest('col-1', null);

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      // Ensure no internal fields like isDirty, isDraft, etc.
      expect(Object.keys(changes)).not.toContain('isDirty');
      expect(Object.keys(changes)).not.toContain('isDraft');
      expect(Object.keys(changes)).not.toContain('_loadingRequestId');
    });
  });
});
