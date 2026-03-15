/**
 * Import Localman native JSON (full backup or single-collection export).
 * Validates schema version and delegates to DB backup service or adds one collection.
 */

import { db } from '../../db/database';
import { importAll } from '../../db/services/backup-service';
import { CURRENT_SCHEMA_VERSION } from '../../db/migrations';
import type { BackupData } from '../../db/services/backup-service';
import type { Collection, Folder, ApiRequest, NativeCollectionExport } from '../../types/models';

export type { BackupData, NativeCollectionExport };

export function isNativeBackup(data: unknown): data is BackupData {
  const o = data as Record<string, unknown>;
  return (
    o != null &&
    typeof o === 'object' &&
    typeof o.schema_version === 'number' &&
    Array.isArray(o.collections) &&
    Array.isArray(o.folders) &&
    Array.isArray(o.requests)
  );
}

export function isNativeCollectionExport(data: unknown): data is NativeCollectionExport {
  const o = data as Record<string, unknown>;
  return (
    o != null &&
    typeof o === 'object' &&
    typeof o.schema_version === 'number' &&
    o.collection != null &&
    typeof o.collection === 'object' &&
    Array.isArray(o.folders) &&
    Array.isArray(o.requests)
  );
}

export async function importNative(data: BackupData): Promise<void> {
  if (data.schema_version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Backup schema version ${data.schema_version} is newer than supported ${CURRENT_SCHEMA_VERSION}`
    );
  }
  await importAll(data);
}

/** Import single-collection native export; regenerates IDs to avoid conflicts. */
export async function importNativeCollection(data: NativeCollectionExport): Promise<void> {
  if (data.schema_version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Export schema version ${data.schema_version} is newer than supported ${CURRENT_SCHEMA_VERSION}`
    );
  }
  const newId = () => globalThis.crypto.randomUUID();
  const ts = new Date().toISOString();
  const oldToNew: Record<string, string> = {};
  oldToNew[data.collection.id] = newId();
  const newCollection: Collection = {
    ...data.collection,
    id: oldToNew[data.collection.id],
    created_at: ts,
    updated_at: ts,
  };
  const folderIdMap: Record<string, string> = {};
  for (const f of data.folders) {
    folderIdMap[f.id] = newId();
  }
  const newFolders: Folder[] = data.folders.map(f => ({
    ...f,
    id: folderIdMap[f.id],
    collection_id: newCollection.id,
    parent_id: f.parent_id ? folderIdMap[f.parent_id] ?? null : null,
    created_at: ts,
    updated_at: ts,
  }));
  const newRequests: ApiRequest[] = data.requests.map(r => ({
    ...r,
    id: newId(),
    collection_id: newCollection.id,
    folder_id: r.folder_id ? folderIdMap[r.folder_id] ?? null : null,
    created_at: ts,
    updated_at: ts,
  }));
  await db.transaction('rw', [db.collections, db.folders, db.requests], async () => {
    await db.collections.add(newCollection);
    if (newFolders.length) await db.folders.bulkAdd(newFolders);
    if (newRequests.length) await db.requests.bulkAdd(newRequests);
  });
}
