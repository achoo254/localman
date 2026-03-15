/**
 * Integration tests for DB layer: CRUD, cascade delete, backup roundtrip.
 * Uses fake-indexeddb so tests run in Node.
 */
import 'fake-indexeddb/auto';
import { db } from './database';
import * as collectionService from './services/collection-service';
import * as folderService from './services/folder-service';
import * as requestService from './services/request-service';
import * as environmentService from './services/environment-service';
import * as historyService from './services/history-service';
import * as settingsService from './services/settings-service';
import * as backupService from './services/backup-service';
import type { AuthConfig } from '../types/common';
import type { RequestBody } from '../types/common';

beforeEach(async () => {
  await Promise.all([
    db.collections.clear(),
    db.folders.clear(),
    db.requests.clear(),
    db.environments.clear(),
    db.history.clear(),
    db.settings.clear(),
  ]);
});

const defaultBody: RequestBody = { type: 'none' };
const defaultAuth: AuthConfig = { type: 'none' };

describe('collection service', () => {
  it('creates and reads collection', async () => {
    const c = await collectionService.create({ name: 'My API', description: 'Test', sort_order: 0 });
    expect(c.id).toBeDefined();
    expect(c.name).toBe('My API');
    const got = await collectionService.getById(c.id);
    expect(got?.name).toBe('My API');
    const all = await collectionService.getAll();
    expect(all).toHaveLength(1);
  });

  it('updates collection', async () => {
    const c = await collectionService.create({ name: 'A', description: '', sort_order: 0 });
    const updated = await collectionService.update(c.id, { name: 'B' });
    expect(updated.name).toBe('B');
  });

  it('cascade deletes folders and requests', async () => {
    const col = await collectionService.create({ name: 'Col', description: '', sort_order: 0 });
    const folder = await folderService.create({
      collection_id: col.id,
      parent_id: null,
      name: 'F1',
      sort_order: 0,
    });
    await requestService.create({
      collection_id: col.id,
      folder_id: folder.id,
      name: 'R1',
      method: 'GET',
      url: 'https://api.example.com',
      params: [],
      headers: [],
      body: defaultBody,
      auth: defaultAuth,
      sort_order: 0,
    });
    await collectionService.remove(col.id);
    expect(await collectionService.getById(col.id)).toBeUndefined();
    expect(await folderService.getById(folder.id)).toBeUndefined();
    const requests = await db.requests.where('collection_id').equals(col.id).toArray();
    expect(requests).toHaveLength(0);
  });
});

describe('folder service', () => {
  it('getChildren returns root folders and nested', async () => {
    const col = await collectionService.create({ name: 'C', description: '', sort_order: 0 });
    await folderService.create({ collection_id: col.id, parent_id: null, name: 'Root1', sort_order: 0 });
    const root2 = await folderService.create({ collection_id: col.id, parent_id: null, name: 'Root2', sort_order: 1 });
    await folderService.create({ collection_id: col.id, parent_id: root2.id, name: 'Child', sort_order: 0 });
    const roots = await folderService.getChildren(null, col.id);
    expect(roots).toHaveLength(2);
    const children = await folderService.getChildren(root2.id, col.id);
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe('Child');
  });
});

describe('request service', () => {
  it('duplicate creates copy with new id', async () => {
    const col = await collectionService.create({ name: 'C', description: '', sort_order: 0 });
    const req = await requestService.create({
      collection_id: col.id,
      folder_id: null,
      name: 'Get User',
      method: 'GET',
      url: 'https://api.example.com/users',
      params: [],
      headers: [],
      body: defaultBody,
      auth: defaultAuth,
      sort_order: 0,
    });
    const copy = await requestService.duplicate(req.id);
    expect(copy.id).not.toBe(req.id);
    expect(copy.name).toContain('copy');
    expect(copy.url).toBe(req.url);
  });
});

describe('environment service', () => {
  it('setActive toggles single active', async () => {
    await environmentService.create({
      name: 'Dev',
      variables: [],
      is_active: true,
    });
    const e2 = await environmentService.create({
      name: 'Prod',
      variables: [],
      is_active: false,
    });
    await environmentService.setActive(e2.id);
    const active = await environmentService.getActive();
    expect(active?.id).toBe(e2.id);
  });
});

describe('history service', () => {
  it('add and query', async () => {
    await historyService.add({
      request_id: 'req-1',
      method: 'GET',
      url: 'https://a.com',
      status_code: 200,
      response_time: 50,
      response_size: 100,
      request_snapshot: { method: 'GET', url: 'https://a.com', headers: [], body: { type: 'none' }, auth: { type: 'none' } },
    });
    const list = await historyService.query({ limit: 10 });
    expect(list).toHaveLength(1);
    expect(list[0].status_code).toBe(200);
  });
});

describe('settings service', () => {
  it('get/set', async () => {
    await settingsService.set('theme', 'dark');
    const theme = await settingsService.get<string>('theme');
    expect(theme).toBe('dark');
  });
});

describe('backup service', () => {
  it('export/import roundtrip', async () => {
    const col = await collectionService.create({ name: 'Backup Col', description: '', sort_order: 0 });
    await requestService.create({
      collection_id: col.id,
      folder_id: null,
      name: 'Req',
      method: 'POST',
      url: 'https://x.com',
      params: [],
      headers: [],
      body: defaultBody,
      auth: defaultAuth,
      sort_order: 0,
    });
    const backup = await backupService.exportAll();
    expect(backup.schema_version).toBe(1);
    expect(backup.collections).toHaveLength(1);
    expect(backup.requests).toHaveLength(1);
    await db.collections.clear();
    await db.requests.clear();
    await backupService.importAll(backup);
    const restored = await collectionService.getAll();
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Backup Col');
  });
});
