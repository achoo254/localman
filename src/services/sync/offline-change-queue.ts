/**
 * Offline change queue — tracks entity mutations while offline
 * for replay when connection is restored.
 */

import { db } from '../../db/database';
import type { PendingChange, SyncEntityType, SyncAction } from '../../types/entity-sync';

/** Enqueue a change to the offline queue */
export async function addPendingChange(
  entityType: SyncEntityType,
  entityId: string,
  action: SyncAction,
  changes: Record<string, unknown>,
  baseVersion: number,
  workspaceId: string | null = null,
): Promise<void> {
  await db.pending_changes.add({
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes,
    base_version: baseVersion,
    workspace_id: workspaceId,
    created_at: new Date().toISOString(),
  });
}

/** Get all pending changes, optionally filtered by workspace */
export async function getPendingChanges(
  workspaceId?: string | null,
): Promise<PendingChange[]> {
  if (workspaceId !== undefined) {
    return db.pending_changes
      .where('workspace_id')
      .equals(workspaceId as string)
      .sortBy('created_at');
  }
  return db.pending_changes.orderBy('created_at').toArray();
}

/** Remove processed changes by their IDs */
export async function clearPendingChanges(ids: number[]): Promise<void> {
  await db.pending_changes.bulkDelete(ids);
}

/** Check if an entity has any pending local changes */
export async function hasPendingChanges(entityId: string): Promise<boolean> {
  const count = await db.pending_changes
    .where('entity_id')
    .equals(entityId)
    .count();
  return count > 0;
}

/** Clear all pending changes (e.g., on logout) */
export async function clearAllPendingChanges(): Promise<void> {
  await db.pending_changes.clear();
}
