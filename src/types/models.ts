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
}

export interface Folder {
  id: string;
  collection_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  pre_script?: string;
  post_script?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
}

export interface HistoryEntry {
  id?: number;
  request_id: string;
  method: HttpMethod;
  url: string;
  status_code: number;
  response_time: number;
  response_size: number;
  request_snapshot: Partial<ApiRequest>;
  response_body?: string;
  response_headers?: Record<string, string>;
  timestamp: string;
}

export interface Setting {
  key: string;
  value: unknown;
}
