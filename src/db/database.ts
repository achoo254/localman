/**
 * Dexie.js database for Localman — IndexedDB schema v1.
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

export class LocalmanDB extends Dexie {
  collections!: Table<Collection>;
  folders!: Table<Folder>;
  requests!: Table<ApiRequest>;
  environments!: Table<Environment>;
  history!: Table<HistoryEntry>;
  settings!: Table<Setting>;

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
  }
}

export const db = new LocalmanDB();
