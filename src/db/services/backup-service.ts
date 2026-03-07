/**
 * Full export/import (JSON backup) with schema version.
 */

import { db } from '../database';
import { CURRENT_SCHEMA_VERSION } from '../migrations';
import type { Collection, Folder, ApiRequest, Environment, HistoryEntry, Setting } from '../../types/models';

export interface BackupData {
  schema_version: number;
  exported_at: string;
  collections: Collection[];
  folders: Folder[];
  requests: ApiRequest[];
  environments: Environment[];
  history: HistoryEntry[];
  settings: Setting[];
}

export async function exportAll(): Promise<BackupData> {
  const [collections, folders, requests, environments, history, settings] = await Promise.all([
    db.collections.toArray(),
    db.folders.toArray(),
    db.requests.toArray(),
    db.environments.toArray(),
    db.history.toArray(),
    db.settings.toArray(),
  ]);
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    collections,
    folders,
    requests,
    environments,
    history,
    settings,
  };
}

export async function importAll(data: BackupData): Promise<void> {
  if (data.schema_version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Backup schema version ${data.schema_version} is newer than supported ${CURRENT_SCHEMA_VERSION}`);
  }
  await db.transaction('rw', db.collections, db.folders, db.requests, async () => {
    await db.collections.clear();
    await db.folders.clear();
    await db.requests.clear();
  });
  await db.transaction('rw', db.environments, db.history, db.settings, async () => {
    await db.environments.clear();
    await db.history.clear();
    await db.settings.clear();
  });
  await db.transaction('rw', db.collections, db.folders, db.requests, async () => {
    if (data.collections?.length) await db.collections.bulkAdd(data.collections);
    if (data.folders?.length) await db.folders.bulkAdd(data.folders);
    if (data.requests?.length) await db.requests.bulkAdd(data.requests);
  });
  await db.transaction('rw', db.environments, db.history, db.settings, async () => {
    if (data.environments?.length) await db.environments.bulkAdd(data.environments);
    if (data.history?.length) await db.history.bulkAdd(data.history);
    if (data.settings?.length) await db.settings.bulkAdd(data.settings);
  });
}
