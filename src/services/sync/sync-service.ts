/**
 * Cloud sync: reconcile algorithm, upload/download, config persistence.
 */

import * as settingsService from '../../db/services/settings-service';
import * as collectionService from '../../db/services/collection-service';
import { db } from '../../db/database';
import { exportCollectionToNative } from '../exporters/native-exporter';
import { exportToPostman } from '../exporters/postman-exporter';
import { importPostmanCollection } from '../importers/postman-importer';
import { listFiles, downloadFile, uploadFile, deleteFile } from './sync-http-client';
import type { SyncConfig } from '../../types/sync';
import { SYNC_CONFIG_KEY, DEFAULT_SYNC_CONFIG } from '../../types/sync';
import type { Collection } from '../../types/models';

/** Exported for unit tests. */
export function reconcile(
  localUpdatedAt: string,
  serverUpdatedAt: string | undefined
): 'upload' | 'download' | 'skip' {
  if (!serverUpdatedAt) return 'upload';
  const localTime = new Date(localUpdatedAt).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();
  if (localTime > serverTime) return 'upload';
  if (serverTime > localTime) return 'download';
  return 'skip';
}

export async function getSyncConfig(): Promise<SyncConfig> {
  const raw = await settingsService.get<SyncConfig>(SYNC_CONFIG_KEY);
  if (!raw) return { ...DEFAULT_SYNC_CONFIG };
  return {
    ...DEFAULT_SYNC_CONFIG,
    ...raw,
    endpoints: { ...DEFAULT_SYNC_CONFIG.endpoints, ...raw.endpoints },
    headers: Array.isArray(raw.headers) ? raw.headers : [],
    params: Array.isArray(raw.params) ? raw.params : [],
  };
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  await settingsService.set(SYNC_CONFIG_KEY, config);
}

export async function upsertCollectionFromPostman(jsonText: string): Promise<void> {
  const json = JSON.parse(jsonText);
  const { collection, folders, requests } = importPostmanCollection(json);
  await db.transaction(
    'rw',
    [db.collections, db.folders, db.requests],
    async () => {
      const existing = await db.collections.get(collection.id);
      if (existing) {
        const folderIds = await db.folders.where('collection_id').equals(collection.id).primaryKeys();
        await db.folders.bulkDelete(folderIds);
        const requestIds = await db.requests.where('collection_id').equals(collection.id).primaryKeys();
        await db.requests.bulkDelete(requestIds);
      }
      await db.collections.put(collection);
      if (folders.length) await db.folders.bulkAdd(folders);
      if (requests.length) await db.requests.bulkAdd(requests);
    }
  );
}

export async function uploadCollection(
  config: SyncConfig,
  collectionId: string
): Promise<void> {
  const data = await exportCollectionToNative(collectionId);
  const postman = exportToPostman(data.collection, data.folders, data.requests);
  const filename = `${collectionId}.json`;
  await uploadFile(config, filename, JSON.stringify(postman));
}

export async function downloadCollection(
  config: SyncConfig,
  filename: string
): Promise<void> {
  const text = await downloadFile(config, filename);
  await upsertCollectionFromPostman(text);
}

export interface SyncAllResult {
  uploaded: number;
  downloaded: number;
  errors: string[];
}

export async function syncAll(config: SyncConfig): Promise<SyncAllResult> {
  const serverList = await listFiles(config);
  const localCollections = await collectionService.getAll();
  const serverByFilename = new Map(serverList.map(e => [e.filename, e]));

  type Action = { type: 'upload'; collection: Collection } | { type: 'download'; filename: string; updatedAt?: string };
  const actions: Action[] = [];

  for (const col of localCollections) {
    const filename = `${col.id}.json`;
    const server = serverByFilename.get(filename);
    if (!server) {
      actions.push({ type: 'upload', collection: col });
      continue;
    }
    const decision = reconcile(col.updated_at, server.updated_at);
    if (decision === 'upload') actions.push({ type: 'upload', collection: col });
    else if (decision === 'download') actions.push({ type: 'download', filename, updatedAt: server.updated_at });
  }

  for (const entry of serverList) {
    if (entry.filename.endsWith('.json') && !localCollections.some(c => `${c.id}.json` === entry.filename)) {
      actions.push({ type: 'download', filename: entry.filename, updatedAt: entry.updated_at });
    }
  }

  const errors: string[] = [];
  let uploaded = 0;
  let downloaded = 0;

  const uploads = actions.filter((a): a is Action & { type: 'upload' } => a.type === 'upload');
  const downloads = actions.filter((a): a is Action & { type: 'download' } => a.type === 'download');

  for (const a of uploads) {
    try {
      await uploadCollection(config, a.collection.id);
      uploaded++;
    } catch (e) {
      errors.push(`${a.collection.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const a of downloads) {
    try {
      await downloadCollection(config, a.filename);
      downloaded++;
    } catch (e) {
      errors.push(`${a.filename}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await saveSyncConfig({
    ...config,
    lastSyncAt: new Date().toISOString(),
  });

  return { uploaded, downloaded, errors };
}

export async function deleteCollectionOnServer(
  config: SyncConfig,
  collectionId: string
): Promise<void> {
  await deleteFile(config, `${collectionId}.json`);
}
