/**
 * WebSocket event handler — listens to incoming WS messages and applies
 * entity changes to Dexie DB + triggers Zustand store refreshes.
 */

import { db } from "../../db/database";
import { wsManager } from "./websocket-manager";
import { pullChanges } from "./entity-sync-service";
import { replayOfflineQueue } from "./offline-queue-replay";
import { addConflictFromServer } from "./conflict-queue";
import { getCurrentUser } from "./firebase-auth-client";
import type { CloudSyncConfig } from "../../types/cloud-sync";

/** Cleanup functions from event subscriptions */
let cleanupFns: Array<() => void> = [];

/** Last event timestamp — used for state reconciliation on reconnect */
let lastEventTime: string | null = null;

/**
 * Initialize WS event handlers — call once after wsManager.connect().
 * Returns a cleanup function to remove all listeners.
 */
export function initWsEventHandlers(
  config: CloudSyncConfig,
  onStoreRefresh?: () => void,
): () => void {
  // Clean up previous handlers if any
  disposeWsEventHandlers();

  cleanupFns.push(
    wsManager.on("entity:updated", async (msg) => {
      lastEventTime = new Date().toISOString();
      const tableName = entityTypeToTable(msg.entity_type as string);
      if (!tableName) return;

      try {
        const table = db.table(tableName);
        const existing = await table.get(msg.entity_id as string);
        if (existing) {
          const changes = (msg.changes ?? {}) as Record<string, unknown>;
          await table.update(msg.entity_id as string, {
            ...changes,
            version: msg.version ?? ((existing as Record<string, unknown>).version as number ?? 0) + 1,
          });
        }
        onStoreRefresh?.();
      } catch (err) {
        console.error("[WS] Failed to apply entity:updated:", err);
      }
    }),

    wsManager.on("entity:created", async (msg) => {
      lastEventTime = new Date().toISOString();
      const tableName = entityTypeToTable(msg.entity_type as string);
      if (!tableName) return;

      try {
        const table = db.table(tableName);
        const data = (msg.entity ?? msg.data ?? {}) as Record<string, unknown>;
        const existing = await table.get(data.id as string);
        if (!existing) {
          await table.add(data);
        }
        onStoreRefresh?.();
      } catch (err) {
        console.error("[WS] Failed to apply entity:created:", err);
      }
    }),

    wsManager.on("entity:deleted", async (msg) => {
      lastEventTime = new Date().toISOString();
      const tableName = entityTypeToTable(msg.entity_type as string);
      if (!tableName) return;

      try {
        await db.table(tableName).delete(msg.entity_id as string);
        onStoreRefresh?.();
      } catch (err) {
        console.error("[WS] Failed to apply entity:deleted:", err);
      }
    }),

    wsManager.on("conflict", (msg) => {
      addConflictFromServer(
        msg.entity_type as string,
        msg.entity_id as string,
        (msg.entity_name as string) ?? msg.entity_type as string,
        msg.server_version as number,
        msg.conflicting_fields as string[],
        (msg.server_values ?? {}) as Record<string, unknown>,
        (msg.client_values ?? {}) as Record<string, unknown>,
        (msg.auto_merged_fields ?? []) as string[],
      );
    }),

    wsManager.on("auto_merged", () => {
      // Auto-merged successfully — just update local version
      lastEventTime = new Date().toISOString();
      onStoreRefresh?.();
    }),

    // State reconciliation on reconnect — replay offline queue, then pull
    wsManager.on("reconnected", async () => {
      if (!getCurrentUser()) return;

      try {
        // Replay offline queue first (handles merge/conflicts)
        await replayOfflineQueue(config);

        // Then pull any remaining remote changes
        if (lastEventTime) {
          const reconConfig = { ...config, lastSyncAt: lastEventTime };
          for (const channel of wsManager.getSubscribedChannels()) {
            const wsId = channel.startsWith("workspace:")
              ? channel.slice("workspace:".length)
              : null;
            await pullChanges(reconConfig, wsId);
          }
        }
        onStoreRefresh?.();
      } catch (err) {
        console.error("[WS] State reconciliation failed:", err);
      }
    }),
  );

  return disposeWsEventHandlers;
}

/** Remove all WS event handlers */
export function disposeWsEventHandlers(): void {
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
}

/** Map entity_type string to Dexie table name */
function entityTypeToTable(entityType: string): string | null {
  const map: Record<string, string> = {
    collection: "collections",
    folder: "folders",
    request: "requests",
    environment: "environments",
  };
  return map[entityType] ?? null;
}
