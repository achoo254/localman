/**
 * Entity-level sync service — pull remote changes and push local changes
 * to the backend API. Replaces the legacy blob-based cloud sync.
 */

import { db } from '../../db/database'
import { getHttpClient } from '../../utils/tauri-http-client'
import { getPendingChanges, clearPendingChanges } from './offline-change-queue'
import { getIdToken } from './firebase-auth-client'
import type { CloudSyncConfig } from '../../types/cloud-sync'
import { getApiBaseUrl } from '../../utils/api-base-url'
import type {
  SyncChangesResponse,
  SyncEntityChange,
  SyncPushPayload,
  SyncPushResponse,
} from '../../types/entity-sync'
import { applyRemoteChanges } from './sync-reconciliation'

/** Pull remote changes since last sync and apply to local DB */
export async function pullChanges(
  config: CloudSyncConfig,
  workspaceId?: string | null,
): Promise<{ applied: number; errors: string[]; serverTime: string }> {
  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated')

  const f = await getHttpClient()
  const params = new URLSearchParams()
  if (config.lastSyncAt) params.set('since', config.lastSyncAt)
  if (workspaceId) params.set('workspace_id', workspaceId)

  const url = `${getApiBaseUrl()}/api/sync/changes?${params}`
  const res = await f(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `Pull failed: ${res.status}`)
  }

  const data = (await res.json()) as SyncChangesResponse
  const errors: string[] = []
  let applied = 0

  const entityMap: Array<[string, SyncEntityChange[]]> = [
    ['collections', data.collections],
    ['folders', data.folders],
    ['requests', data.requests],
    ['environments', data.environments],
  ]

  for (const [table, changes] of entityMap) {
    for (const change of changes) {
      try {
        await applyRemoteChanges(table, change)
        applied++
      } catch (e) {
        errors.push(`${table}/${change.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return { applied, errors, serverTime: data.server_time }
}

/** Push pending local changes to the server */
export async function pushChanges(
  _config: CloudSyncConfig,
  workspaceId?: string | null,
): Promise<{ pushed: number; conflicts: number; errors: string[] }> {
  const pending = await getPendingChanges(workspaceId)
  if (pending.length === 0) return { pushed: 0, conflicts: 0, errors: [] }

  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated')

  const f = await getHttpClient()
  const payload: SyncPushPayload = {
    workspace_id: workspaceId ?? null,
    changes: pending,
  }

  const res = await f(`${getApiBaseUrl()}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `Push failed: ${res.status}`)
  }

  const data = (await res.json()) as SyncPushResponse
  const errors: string[] = []
  let pushed = 0
  let conflicts = 0
  const processedIds: number[] = []

  for (const result of data.processed) {
    if (result.status === 'ok') {
      pushed++
      const match = pending.find(p => p.entity_id === result.entity_id)
      if (result.new_version && match) {
        await updateLocalVersion(match.entity_type, result.entity_id, result.new_version)
      }
      if (match?.id) processedIds.push(match.id)
    } else if (result.status === 'conflict') {
      conflicts++
      // Leave in queue for Phase 4 conflict resolution
    } else {
      errors.push(`${result.entity_id}: ${result.message ?? 'unknown error'}`)
      const match = pending.find(p => p.entity_id === result.entity_id)
      if (match?.id) processedIds.push(match.id)
    }
  }

  if (processedIds.length > 0) {
    await clearPendingChanges(processedIds)
  }

  return { pushed, conflicts, errors }
}

/** Update local entity version after successful push */
async function updateLocalVersion(entityType: string, entityId: string, newVersion: number): Promise<void> {
  const tableMap: Record<string, string> = {
    collection: 'collections',
    folder: 'folders',
    request: 'requests',
    environment: 'environments',
  }
  const tableName = tableMap[entityType] ?? `${entityType}s`
  await db.table(tableName).update(entityId, { version: newVersion })
}

/** Full sync: pull then push for a workspace or personal items */
export async function syncAll(
  config: CloudSyncConfig,
  workspaceId?: string | null,
): Promise<{ pulled: number; pushed: number; conflicts: number; errors: string[]; serverTime: string }> {
  const pullResult = await pullChanges(config, workspaceId)
  const pushResult = await pushChanges(config, workspaceId)

  return {
    pulled: pullResult.applied,
    pushed: pushResult.pushed,
    conflicts: pushResult.conflicts,
    errors: [...pullResult.errors, ...pushResult.errors],
    serverTime: pullResult.serverTime,
  }
}
