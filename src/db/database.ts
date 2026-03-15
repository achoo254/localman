/**
 * Dexie.js database for Localman — IndexedDB schema v3.
 */

import Dexie, { type Table } from 'dexie';
import type {
  Collection,
  Folder,
  ApiRequest,
  Environment,
  HistoryEntry,
  Setting,
} from '../types/models';
import type { PendingChange } from '../types/entity-sync';

export class LocalmanDB extends Dexie {
  collections!: Table<Collection>;
  folders!: Table<Folder>;
  requests!: Table<ApiRequest>;
  environments!: Table<Environment>;
  history!: Table<HistoryEntry>;
  settings!: Table<Setting>;
  pending_changes!: Table<PendingChange>;
  drafts!: Table<ApiRequest>;

  constructor() {
    super('localman');
    this.version(1).stores({
      collections: 'id, name, sort_order, updated_at',
      folders: 'id, collection_id, parent_id, [collection_id+parent_id], sort_order, updated_at',
      requests: 'id, collection_id, folder_id, [collection_id+folder_id], sort_order, updated_at',
      environments: 'id, name, updated_at',
      history: '++id, request_id, timestamp, method, status_code',
      settings: 'key',
    });
    // v2: Add optional description field to requests (no data migration needed)
    this.version(2).stores({});
    // v3: Add sync fields + pending_changes table for entity-level sync
    this.version(3).stores({
      collections: 'id, name, workspace_id, user_id, is_synced, sort_order, updated_at',
      environments: 'id, name, workspace_id, user_id, is_synced, updated_at',
      pending_changes: '++id, entity_type, entity_id, action, workspace_id, created_at',
    }).upgrade(tx => {
      // Set defaults on existing collections
      tx.table('collections').toCollection().modify(c => {
        if (c.workspace_id === undefined) c.workspace_id = null;
        if (c.user_id === undefined) c.user_id = null;
        if (c.is_synced === undefined) c.is_synced = false;
        if (c.version === undefined) c.version = 1;
      });
      // Set defaults on existing environments
      tx.table('environments').toCollection().modify(e => {
        if (e.workspace_id === undefined) e.workspace_id = null;
        if (e.user_id === undefined) e.user_id = null;
        if (e.is_synced === undefined) e.is_synced = false;
        if (e.version === undefined) e.version = 1;
      });
      // Set defaults on existing folders
      tx.table('folders').toCollection().modify(f => {
        if (f.version === undefined) f.version = 1;
      });
      // Set defaults on existing requests
      tx.table('requests').toCollection().modify(r => {
        if (r.version === undefined) r.version = 1;
      });
    });
    // v4: Add drafts table for persisting unsaved draft requests
    this.version(4).stores({
      drafts: 'id',
    });
  }
}

export const db = new LocalmanDB();

// Global handler for uncaught QuotaExceededError from IndexedDB
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    if (
      (err instanceof DOMException && err.name === 'QuotaExceededError') ||
      (err && typeof err === 'object' && 'inner' in err &&
        (err as { inner: { name?: string } }).inner?.name === 'QuotaExceededError')
    ) {
      event.preventDefault();
      // Lazy import to avoid circular dependency
      void import('../utils/db-error-handler').then(({ handleDbError }) => {
        handleDbError(err, 'storage-quota');
      });
    }
  });
}

/** Quick DB health check — returns false if DB is inaccessible */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await db.settings.count();
    return true;
  } catch {
    return false;
  }
}
