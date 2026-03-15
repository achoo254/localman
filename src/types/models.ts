/**
 * IndexedDB entity interfaces for Localman.
 */

import type { HttpMethod } from './enums';
import type { KeyValuePair, RequestBody, AuthConfig } from './common';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  workspace_id?: string | null;
  user_id?: string | null;
  is_synced?: boolean;
  version?: number;
}

export interface Folder {
  id: string;
  collection_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  version?: number;
}

export interface ApiRequest {
  id: string;
  collection_id: string;
  folder_id: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  description?: string;
  pre_script?: string;
  post_script?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  version?: number;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  secret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workspace_id?: string | null;
  user_id?: string | null;
  is_synced?: boolean;
  version?: number;
}

/**
 * Focused snapshot stored inside HistoryEntry — only the fields needed
 * to display or replay a past request. Tighter than Partial<ApiRequest>.
 */
export interface RequestSnapshot {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  params?: KeyValuePair[];
}

export interface HistoryEntry {
  id?: number;
  request_id: string;
  method: HttpMethod;
  url: string;
  status_code: number;
  response_time: number;
  response_size: number;
  request_snapshot: RequestSnapshot;
  response_body?: string;
  response_headers?: Record<string, string>;
  timestamp: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

/** Shared type for single-collection native JSON export/import. */
export interface NativeCollectionExport {
  schema_version: number;
  exported_at: string;
  collection: Collection;
  folders: Folder[];
  requests: ApiRequest[];
}
