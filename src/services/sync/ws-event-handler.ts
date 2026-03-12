/**
 * WebSocket event handler — listens to incoming WS messages and applies
 * entity changes to Dexie DB + triggers Zustand store refreshes.
 */

import { db } from "../../db/database";
import { wsManager } from "./websocket-manager";
import { pullChanges } from "./entity-sync-service";
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
      // Store conflict for Phase 4 resolution UI
      console.warn("[WS] Conflict received:", msg.entity_type, msg.entity_id);
    }),

    // State reconciliation on reconnect — fetch missed changes via HTTP
    wsManager.on("reconnected", async () => {
      if (!lastEventTime || !config.token) return;

      try {
        const reconConfig = { ...config, lastSyncAt: lastEventTime };
        // Pull changes for each subscribed workspace
        for (const channel of wsManager.getSubscribedChannels()) {
          const wsId = channel.startsWith("workspace:")
            ? channel.slice("workspace:".length)
            : null;
          await pullChanges(reconConfig, wsId);
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
