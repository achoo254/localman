/**
 * Cloud sync config and server list types.
 */

export interface SyncEndpoints {
  list: string;
  download: string;
  upload: string;
  delete: string;
}

export interface SyncKeyValue {
  key: string;
  value: string;
}

export interface SyncConfig {
  enabled: boolean;
  endpoints: SyncEndpoints;
  headers: SyncKeyValue[];
  params: SyncKeyValue[];
  lastSyncAt: string | null;
}

export interface ServerFileEntry {
  filename: string;
  updated_at?: string;
}

export const SYNC_CONFIG_KEY = 'sync.config';

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  endpoints: {
    list: '',
    download: '',
    upload: '',
    delete: '',
  },
  headers: [],
  params: [],
  lastSyncAt: null,
};
