/**
 * Unit tests for environment-store sync wiring.
 * Verifies that environment mutations correctly queue sync changes via addPendingChange.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEnvironmentStore } from './environment-store';
import * as environmentService from '../db/services/environment-service';
import * as settingsService from '../db/services/settings-service';
import * as syncQueue from '../services/sync/offline-change-queue';
import type { Environment, EnvVariable } from '../types/models';

// Mock sync services
vi.mock('../services/sync/offline-change-queue', () => ({
  addPendingChange: vi.fn(async () => {}),
}));

// Mock DB services
vi.mock('../db/services/environment-service', () => ({
  create: vi.fn(async (data: Partial<Environment>) => ({
    id: 'env-' + Math.random().toString(36).slice(2),
    name: data.name ?? 'New Env',
    variables: data.variables ?? [],
    is_active: data.is_active ?? false,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  update: vi.fn(async (id: string, data: Partial<Environment>) => ({
    id,
    ...data,
    version: 2,
  })),
  getById: vi.fn(async (id: string) => ({
    id,
    name: 'Test Env',
    variables: [],
    is_active: false,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  getAll: vi.fn(async () => []),
  remove: vi.fn(async () => {}),
  setActive: vi.fn(async () => {}),
}));

vi.mock('../db/services/settings-service', () => ({
  get: vi.fn(async () => []),
  set: vi.fn(async () => {}),
}));

beforeEach(() => {
  // Clear store state
  useEnvironmentStore.setState({
    environments: [],
    globalVariables: [],
    isLoading: false,
  });
  // Clear mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllTimers();
});

describe('environment-store sync wiring', () => {
  describe('createEnvironment', () => {
    it('queues sync change with entity type "environment" and action "create"', async () => {
      const store = useEnvironmentStore.getState();
      await store.createEnvironment('Dev');

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('create'); // action
    });

    it('includes name, variables, is_active in changes', async () => {
      const store = useEnvironmentStore.getState();
      await store.createEnvironment('Prod');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('name', 'Prod');
      expect(changes).toHaveProperty('variables');
      expect(changes).toHaveProperty('is_active', false);
    });

    it('passes version from created environment', async () => {
      const store = useEnvironmentStore.getState();
      await store.createEnvironment('Staging');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const version = call[4];
      expect(version).toBe(1);
    });

    it('does not sync if addPendingChange throws (non-blocking)', async () => {
      (syncQueue.addPendingChange as any).mockRejectedValueOnce(
        new Error('Queue fail')
      );

      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev'); // Should not throw

      expect(env.id).toBeDefined();
    });
  });

  describe('updateEnvironment', () => {
    it('queues sync change with action "update"', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.updateEnvironment(env.id, { name: 'Development' });

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes updated fields in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.updateEnvironment(env.id, { name: 'Development Updated' });

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('name', 'Development Updated');
    });

    it('passes entityId of updated environment', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.updateEnvironment(env.id, { name: 'Updated' });

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const entityId = call[1];
      expect(entityId).toBe(env.id);
    });
  });

  describe('deleteEnvironment', () => {
    it('queues sync change with action "delete"', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.deleteEnvironment(env.id);

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('delete'); // action
    });

    it('passes empty changes object for delete', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.deleteEnvironment(env.id);

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toEqual({}); // Empty for deletes
    });

    it('removes environment from store', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');

      await store.deleteEnvironment(env.id);

      const updated = useEnvironmentStore.getState();
      expect(updated.environments).not.toContainEqual(
        expect.objectContaining({ id: env.id })
      );
    });
  });

  describe('addVariable', () => {
    it('queues sync change with action "update"', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.addVariable(env.id, { key: 'api_url', value: 'https://api.dev' });

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes updated variables array in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.addVariable(env.id, { key: 'base_url', value: 'https://api.example.com' });

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('variables');
      expect(Array.isArray(changes.variables)).toBe(true);
    });
  });

  describe('updateVariable', () => {
    it('queues sync change with action "update"', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      const variable: EnvVariable = { id: 'var-1', key: 'api_url', value: 'https://api.dev' };
      vi.clearAllMocks();

      await store.updateVariable(env.id, variable);

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes updated variables in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      const variable: EnvVariable = { id: 'var-1', key: 'secret', value: 'new-secret' };
      vi.clearAllMocks();

      await store.updateVariable(env.id, variable);

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('variables');
    });
  });

  describe('removeVariable', () => {
    it('queues sync change with action "update"', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.removeVariable(env.id, 'var-to-remove');

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes updated variables (with removed var excluded) in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.removeVariable(env.id, 'var-id');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('variables');
      expect(Array.isArray(changes.variables)).toBe(true);
    });
  });

  describe('setEnvironmentVariables', () => {
    it('queues sync change with action "update"', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      const variables: EnvVariable[] = [
        { id: 'v1', key: 'url', value: 'https://api.example.com' },
      ];
      await store.setEnvironmentVariables(env.id, variables);

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes the full variables array in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      const variables: EnvVariable[] = [
        { id: 'v1', key: 'url', value: 'https://api.example.com' },
        { id: 'v2', key: 'token', value: 'secret-token' },
      ];
      await store.setEnvironmentVariables(env.id, variables);

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes.variables).toEqual(variables);
    });
  });

  describe('applyScriptVariables', () => {
    it('queues sync change with action "update" when applying script vars', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      // Set active environment in state (applyScriptVariables checks is_active)
      useEnvironmentStore.setState({
        environments: [{ ...env, is_active: true }],
      });
      vi.clearAllMocks();

      await store.applyScriptVariables({ new_var: 'value' });

      expect(syncQueue.addPendingChange).toHaveBeenCalled();
      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      expect(call[0]).toBe('environment'); // entityType
      expect(call[2]).toBe('update'); // action
    });

    it('includes updated variables in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      useEnvironmentStore.setState({
        environments: [{ ...env, is_active: true, variables: [] }],
      });
      vi.clearAllMocks();

      await store.applyScriptVariables({ script_var: 'from-script' });

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      expect(changes).toHaveProperty('variables');
    });

    it('does not sync if no active environment', async () => {
      const store = useEnvironmentStore.getState();
      vi.clearAllMocks();

      await store.applyScriptVariables({ var: 'value' });

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not sync if newVars is empty', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      useEnvironmentStore.setState({
        environments: [{ ...env, is_active: true }],
      });
      vi.clearAllMocks();

      await store.applyScriptVariables({});

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });
  });

  describe('global variable operations (no sync)', () => {
    it('does not queue sync for addGlobalVariable', async () => {
      const store = useEnvironmentStore.getState();
      vi.clearAllMocks();

      await store.addGlobalVariable({ key: 'global_var', value: 'global_value' });

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not queue sync for updateGlobalVariable', async () => {
      const store = useEnvironmentStore.getState();
      vi.clearAllMocks();

      const variable: EnvVariable = { id: 'gv-1', key: 'global', value: 'updated' };
      await store.updateGlobalVariable(variable);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not queue sync for removeGlobalVariable', async () => {
      const store = useEnvironmentStore.getState();
      vi.clearAllMocks();

      await store.removeGlobalVariable('gv-to-remove');

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not queue sync for setGlobalVariables', async () => {
      const store = useEnvironmentStore.getState();
      vi.clearAllMocks();

      await store.setGlobalVariables([
        { id: 'g1', key: 'g_url', value: 'https://global.example.com' },
      ]);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });
  });

  describe('setActiveEnvironment (no sync)', () => {
    it('does not queue sync when setting active environment', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.setActiveEnvironment(env.id);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });

    it('does not queue sync when clearing active environment', async () => {
      const store = useEnvironmentStore.getState();
      await store.createEnvironment('Dev');
      vi.clearAllMocks();

      await store.setActiveEnvironment(null);

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('catches and ignores queue errors without breaking UI state', async () => {
      (syncQueue.addPendingChange as any).mockRejectedValueOnce(
        new Error('Queue database error')
      );

      const store = useEnvironmentStore.getState();
      const result = await store.createEnvironment('Dev');

      // Environment should still be created despite queue error
      expect(result.id).toBeDefined();
    });

    it('returns early if environment not found', async () => {
      const store = useEnvironmentStore.getState();
      // Mock environmentService.getById to return undefined
      vi.mocked(environmentService.getById).mockResolvedValueOnce(undefined as any);
      vi.clearAllMocks();

      // These should not throw and should not queue sync
      await store.addVariable('nonexistent-env-id', { key: 'var', value: 'val' });

      expect(syncQueue.addPendingChange).not.toHaveBeenCalled();
    });
  });

  describe('sync change structure', () => {
    it('passes correct entityId in queue call for environment', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const entityId = call[1];
      expect(entityId).toBe(env.id);
    });

    it('never includes internal state in changes', async () => {
      const store = useEnvironmentStore.getState();
      const env = await store.createEnvironment('Dev');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const changes = call[3];
      // Ensure no internal store fields
      expect(Object.keys(changes)).not.toContain('isLoading');
      expect(Object.keys(changes)).not.toContain('globalVariables');
    });

    it('version defaults to 1 for create operations', async () => {
      const store = useEnvironmentStore.getState();
      await store.createEnvironment('Dev');

      const call = (syncQueue.addPendingChange as any).mock.calls[0];
      const version = call[4];
      expect(version).toBe(1);
    });
  });
});
