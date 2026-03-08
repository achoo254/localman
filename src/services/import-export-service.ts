/**
 * Import/Export orchestrator: file dialogs, format detection, run importers/exporters.
 * File open/save use Tauri APIs — only available in desktop app (pnpm tauri dev / tauri build).
 */

import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return !!(w.__TAURI__ ?? w.__TAURI_INTERNALS__);
}
import { parseCurl } from './importers/curl-parser';
import { importPostmanCollection } from './importers/postman-importer';
import { importNative, importNativeCollection, isNativeBackup, isNativeCollectionExport } from './importers/native-importer';
import type { BackupData, NativeCollectionExport } from './importers/native-importer';
import { exportToCurl } from './exporters/curl-exporter';
import { exportCollectionToNative, exportFullBackup } from './exporters/native-exporter';
import { exportToPostman } from './exporters/postman-exporter';
import { db } from '../db/database';
import * as collectionService from '../db/services/collection-service';
import * as requestService from '../db/services/request-service';
import type { ApiRequest } from '../types/models';
import type { InterpolationContext } from './interpolation-engine';
import type { PostmanCollection } from './importers/postman-types';

export type ImportFormat = 'postman' | 'native' | 'curl';

export interface ImportPreview {
  format: ImportFormat;
  collectionName?: string;
  requestCount?: number;
  folderCount?: number;
}

function detectFormat(json: unknown): ImportFormat | null {
  const o = json as Record<string, unknown>;
  if (isNativeBackup(json)) return 'native';
  if (isNativeCollectionExport(json)) return 'native';
  if (o?.info && typeof (o.info as Record<string, unknown>).schema === 'string') return 'postman';
  return null;
}

export async function openImportFile(): Promise<{ path: string; content: string } | null> {
  if (!isTauri()) {
    throw new Error('Import from file is only available in the desktop app. Run with pnpm tauri dev or use the cURL tab.');
  }
  const path = await open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'All', extensions: ['*'] }],
  });
  if (!path || typeof path !== 'string') return null;
  const content = await readTextFile(path);
  return { path, content };
}

export async function importFromFileContent(content: string): Promise<ImportPreview | null> {
  let json: unknown;
  try {
    json = JSON.parse(content) as unknown;
  } catch {
    return null;
  }
  const format = detectFormat(json);
  if (format === null) return null;
  if (format === 'postman') {
    const result = importPostmanCollection(json as PostmanCollection);
    await db.transaction('rw', [db.collections, db.folders, db.requests], async () => {
      await db.collections.add(result.collection);
      if (result.folders.length) await db.folders.bulkAdd(result.folders);
      if (result.requests.length) await db.requests.bulkAdd(result.requests);
    });
    return {
      format: 'postman',
      collectionName: result.collection.name,
      requestCount: result.requests.length,
      folderCount: result.folders.length,
    };
  }
  if (format === 'native') {
    if (isNativeBackup(json)) {
      await importNative(json as BackupData);
      const data = json as BackupData;
      return {
        format: 'native',
        collectionName: data.collections?.[0]?.name,
        requestCount: data.requests?.length ?? 0,
        folderCount: data.folders?.length ?? 0,
      };
    }
    if (isNativeCollectionExport(json)) {
      await importNativeCollection(json as NativeCollectionExport);
      const data = json as { collection: { name: string }; folders: unknown[]; requests: unknown[] };
      return {
        format: 'native',
        collectionName: data.collection.name,
        requestCount: data.requests.length,
        folderCount: data.folders.length,
      };
    }
  }
  return null;
}

export async function importFromCurl(curlCommand: string): Promise<ImportPreview> {
  const partial = parseCurl(curlCommand);
  const list = await collectionService.getAll();
  const sortOrder = list.length > 0 ? Math.max(...list.map(c => c.sort_order)) + 1 : 0;
  const collection = await collectionService.create({
    name: 'Imported from cURL',
    sort_order: sortOrder,
  });
  const requestData: Omit<ApiRequest, 'id' | 'created_at' | 'updated_at'> = {
    collection_id: collection.id,
    folder_id: null,
    name: (partial.name ?? partial.url) || 'Request',
    method: partial.method ?? 'GET',
    url: partial.url ?? '',
    params: partial.params ?? [],
    headers: partial.headers ?? [],
    body: partial.body ?? { type: 'none' },
    auth: partial.auth ?? { type: 'none' },
    sort_order: 0,
  };
  await requestService.create(requestData);
  return {
    format: 'curl',
    collectionName: collection.name,
    requestCount: 1,
  };
}

export async function saveExportFile(defaultName: string, content: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Save to file is only available in the desktop app. Run with pnpm tauri dev.');
  }
  const path = await save({ defaultPath: defaultName });
  if (!path) return false;
  await writeTextFile(path, content);
  return true;
}

export function getCurlForRequest(request: ApiRequest, context?: InterpolationContext): string {
  return exportToCurl(request, context);
}

export async function exportCollectionAsNative(collectionId: string): Promise<string> {
  const data = await exportCollectionToNative(collectionId);
  return JSON.stringify(data, null, 2);
}

export async function exportCollectionAsPostman(collectionId: string): Promise<string> {
  const data = await exportCollectionToNative(collectionId);
  const postman = exportToPostman(data.collection, data.folders, data.requests);
  return JSON.stringify(postman, null, 2);
}

export async function exportFullBackupJson(): Promise<string> {
  const data = await exportFullBackup();
  return JSON.stringify(data, null, 2);
}

/** Clear all app data (collections, folders, requests, environments, history). Keeps settings. */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.collections, db.folders, db.requests, db.environments, db.history],
    async () => {
      await db.collections.clear();
      await db.folders.clear();
      await db.requests.clear();
      await db.environments.clear();
      await db.history.clear();
    }
  );
}
