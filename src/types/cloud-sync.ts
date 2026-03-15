/**
 * Cloud sync types for Firebase Auth + pull/push sync.
 */

export interface CloudSyncConfig {
  enabled: boolean
  userEmail: string | null
  userName: string | null
  userAvatar: string | null
  lastSyncAt: string | null
}

export const CLOUD_SYNC_CONFIG_KEY = 'cloud.sync.config'

export const DEFAULT_CLOUD_SYNC_CONFIG: CloudSyncConfig = {
  enabled: false,
  userEmail: null,
  userName: null,
  userAvatar: null,
  lastSyncAt: null,
}

export interface SyncFile {
  filename: string
  entityType: 'collection' | 'environment'
  content: unknown
  updatedAt: string
}

export interface SyncPullResponse {
  files: SyncFile[]
  serverTime: string
}

export interface SyncPushPayload {
  changes: SyncFile[]
  deletions: string[]
}

export interface SyncPushResponse {
  synced: number
  deleted: number
  serverTime: string
}
