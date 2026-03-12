/**
 * Sync reconciliation — applies remote entity changes to local Dexie DB.
 * Compares versions and skips entities with pending local changes.
 */

import { db } from '../../db/database';
import { hasPendingChanges } from './offline-change-queue';
import type { SyncEntityChange } from '../../types/entity-sync';

/** Apply a single remote entity change to local DB */
export async function applyRemoteChanges(
  tableName: string,
  change: SyncEntityChange,
): Promise<void> {
  // Skip if entity has pending local changes (defer to Phase 4 merge)
  if (change.action !== 'delete' && await hasPendingChanges(change.id)) {
    return;
  }

  const table = db.table(tableName);

  switch (change.action) {
    case 'create': {
      if (!change.data) break;
      const existing = await table.get(change.id);
      if (!existing) {
        await table.add({ ...change.data, id: change.id, version: change.version });
      }
      break;
    }

    case 'update': {
      if (!change.data) break;
      const existing = await table.get(change.id);
      if (!existing) {
        // Entity doesn't exist locally — treat as create
        await table.add({ ...change.data, id: change.id, version: change.version });
      } else if (change.version > ((existing as Record<string, unknown>).version as number ?? 0)) {
        // Server version is newer — apply update
        await table.update(change.id, { ...change.data, version: change.version });
      }
      // If local version >= server version, skip (local is newer or same)
      break;
    }

    case 'delete': {
      // Skip delete if entity has pending local changes (defer to Phase 4)
      if (await hasPendingChanges(change.id)) return;
      await table.delete(change.id);
      break;
    }
  }
}
