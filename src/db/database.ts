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
  }
}

export const db = new LocalmanDB();
