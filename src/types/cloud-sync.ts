/**
 * Cloud sync types for Better Auth + pull/push sync.
 */

export interface CloudSyncConfig {
  enabled: boolean;
  serverUrl: string;
  token: string | null;
  userEmail: string | null;
  userName: string | null;
  lastSyncAt: string | null;
}

export const CLOUD_SYNC_CONFIG_KEY = "cloud.sync.config";

export const DEFAULT_CLOUD_SYNC_CONFIG: CloudSyncConfig = {
  enabled: false,
  serverUrl: "",
  token: null,
  userEmail: null,
  userName: null,
  lastSyncAt: null,
};

export interface SyncFile {
  filename: string;
  entityType: "collection" | "environment";
  content: unknown;
  updatedAt: string;
}

export interface SyncPullResponse {
  files: SyncFile[];
  serverTime: string;
}

export interface SyncPushPayload {
  changes: SyncFile[];
  deletions: string[];
}

export interface SyncPushResponse {
  synced: number;
  deleted: number;
  serverTime: string;
}
