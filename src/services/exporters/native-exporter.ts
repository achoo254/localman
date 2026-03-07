/**
 * Export to Localman native JSON (single collection or full backup).
 */

import { db } from '../../db/database';
import { exportAll } from '../../db/services/backup-service';
import { CURRENT_SCHEMA_VERSION } from '../../db/migrations';
import type { BackupData } from '../../db/services/backup-service';
import type { NativeCollectionExport } from '../../types/models';

export type { NativeCollectionExport };

/**
 * Export a single collection with its folders and requests.
 */
export async function exportCollectionToNative(
  collectionId: string
): Promise<NativeCollectionExport> {
  const [collection, folders, requests] = await Promise.all([
    db.collections.get(collectionId),
    db.folders.where('collection_id').equals(collectionId).toArray(),
    db.requests.where('collection_id').equals(collectionId).toArray(),
  ]);
  if (!collection) throw new Error(`Collection not found: ${collectionId}`);
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    collection,
    folders,
    requests,
  };
}

/**
 * Export full backup (all collections, envs, settings, history).
 */
export async function exportFullBackup(): Promise<BackupData> {
  return exportAll();
}
