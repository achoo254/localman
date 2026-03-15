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

// --- Validation helpers ---

const KNOWN_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const RESPONSE_BODY_MAX_BYTES = 100 * 1024; // 100 KB

/** Validates that an item has a non-empty string id and name, and a finite numeric sort_order. */
function validateSortable(item: unknown, label: string): void {
  const i = item as Record<string, unknown>;
  if (typeof i.id !== 'string' || i.id.trim() === '') {
    throw new Error(`${label}: invalid or missing "id" field`);
  }
  if (typeof i.name !== 'string' || i.name.trim() === '') {
    throw new Error(`${label} id="${i.id}": invalid or missing "name" field`);
  }
  if (typeof i.sort_order !== 'number' || !isFinite(i.sort_order)) {
    throw new Error(`${label} id="${i.id}": "sort_order" must be a finite number`);
  }
}

/** Validates and sanitises imported data in-place. Throws on unrecoverable issues. */
function validateBackupData(data: BackupData): void {
  // Collections, folders, requests, environments — all must have id, name, sort_order
  for (const col of data.collections ?? []) validateSortable(col, 'collection');
  for (const fol of data.folders ?? []) validateSortable(fol, 'folder');
  for (const req of data.requests ?? []) validateSortable(req, 'request');
  for (const env of data.environments ?? []) validateSortable(env, 'environment');

  // Enforce at most one active environment
  const activeEnvs = (data.environments ?? []).filter((e) => e.is_active);
  if (activeEnvs.length > 1) {
    // Keep the first active; de-activate the rest
    for (let i = 1; i < activeEnvs.length; i++) {
      activeEnvs[i].is_active = false;
    }
  }

  // History: validate method, cap response_body
  for (const entry of data.history ?? []) {
    const e = entry as unknown as Record<string, unknown>;
    if (typeof e.method === 'string' && !KNOWN_HTTP_METHODS.has(e.method.toUpperCase())) {
      throw new Error(`history entry: unknown HTTP method "${e.method}"`);
    }
    if (typeof e.response_body === 'string' && e.response_body.length > RESPONSE_BODY_MAX_BYTES) {
      (entry as unknown as Record<string, unknown>).response_body = e.response_body.slice(0, RESPONSE_BODY_MAX_BYTES);
    }
  }
}

// --- Public API ---

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

  // Validate all fields before touching the DB
  validateBackupData(data);

  // Single atomic transaction: all clears and writes happen together or not at all
  await db.transaction('rw', [db.collections, db.folders, db.requests, db.environments, db.history, db.settings], async () => {
    await db.collections.clear();
    await db.folders.clear();
    await db.requests.clear();
    await db.environments.clear();
    await db.history.clear();
    await db.settings.clear();
    if (data.collections?.length) await db.collections.bulkAdd(data.collections);
    if (data.folders?.length) await db.folders.bulkAdd(data.folders);
    if (data.requests?.length) await db.requests.bulkAdd(data.requests);
    if (data.environments?.length) await db.environments.bulkAdd(data.environments);
    if (data.history?.length) await db.history.bulkAdd(data.history);
    if (data.settings?.length) await db.settings.bulkAdd(data.settings);
  });
}
