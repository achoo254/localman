/**
 * Entity-level sync types for workspace-aware cloud sync.
 */

/** Entity types that support sync */
export type SyncEntityType = 'collection' | 'folder' | 'request' | 'environment';

/** Mutation actions tracked in offline queue */
export type SyncAction = 'create' | 'update' | 'delete';

/** Offline change queue entry stored in IndexedDB */
export interface PendingChange {
  id?: number;
  entity_type: SyncEntityType;
  entity_id: string;
  action: SyncAction;
  changes: Record<string, unknown>;
  base_version: number;
  workspace_id: string | null;
  created_at: string;
}

/** Server response for delta sync pull */
export interface SyncChangesResponse {
  collections: SyncEntityChange[];
  folders: SyncEntityChange[];
  requests: SyncEntityChange[];
  environments: SyncEntityChange[];
  server_time: string;
}

/** Single entity change from server */
export interface SyncEntityChange {
  id: string;
  action: SyncAction;
  data: Record<string, unknown> | null;
  version: number;
  updated_at: string;
}

/** Push payload sent to server */
export interface SyncPushPayload {
  workspace_id: string | null;
  changes: PendingChange[];
}

/** Server response for push */
export interface SyncPushResponse {
  processed: SyncPushResult[];
  server_time: string;
}

/** Result for each pushed change */
export interface SyncPushResult {
  entity_id: string;
  status: 'ok' | 'conflict' | 'error';
  new_version?: number;
  message?: string;
}
