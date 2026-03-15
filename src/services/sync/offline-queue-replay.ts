/**
 * Offline queue replay — processes pending changes in order on reconnect,
 * handling merge results (ok, auto_merged, conflict) per entity.
 */

import { getPendingChanges, clearPendingChanges } from "./offline-change-queue";
import { addConflictFromServer } from "./conflict-queue";
import { getHttpClient } from "../../utils/tauri-http-client";
import { getIdToken } from "./firebase-auth-client";
import { db } from "../../db/database";
import type { CloudSyncConfig } from "../../types/cloud-sync";
import { getApiBaseUrl } from "../../utils/api-base-url";

interface ReplayResult {
  pushed: number;
  autoMerged: number;
  conflicts: number;
  errors: string[];
}

/** Replay all pending offline changes via HTTP push with merge support */
export async function replayOfflineQueue(
  _config: CloudSyncConfig,
  workspaceId?: string | null,
): Promise<ReplayResult> {
  const pending = await getPendingChanges(workspaceId);
  if (pending.length === 0) return { pushed: 0, autoMerged: 0, conflicts: 0, errors: [] };

  const f = await getHttpClient();
  const result: ReplayResult = { pushed: 0, autoMerged: 0, conflicts: 0, errors: [] };
  const processedIds: number[] = [];

  // Process in order (sorted by created_at)
  const sorted = [...pending].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Send as batch via push endpoint
  const token = await getIdToken();
  if (!token) {
    result.errors.push("Not authenticated");
    return result;
  }
  const res = await f(`${getApiBaseUrl()}/api/sync/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      changes: sorted.map((c) => ({
        entityType: c.entity_type,
        id: c.entity_id,
        data: c.changes,
        version: c.base_version,
        deleted: c.action === "delete",
      })),
    }),
  });

  if (!res.ok) {
    result.errors.push(`Replay push failed: ${res.status}`);
    return result;
  }

  const body = (await res.json()) as {
    processed?: Array<{
      entity_id: string;
      status: string;
      new_version?: number;
      auto_merged_fields?: string[];
      conflicting_fields?: string[];
      server_values?: Record<string, unknown>;
      client_values?: Record<string, unknown>;
    }>;
  };

  if (!body.processed) return result;

  for (const item of body.processed) {
    const match = sorted.find((p) => p.entity_id === item.entity_id);

    if (item.status === "ok") {
      result.pushed++;
      if (item.new_version && match) {
        await updateLocalVersion(match.entity_type, item.entity_id, item.new_version);
      }
      if (match?.id) processedIds.push(match.id);
    } else if (item.status === "auto_merged") {
      result.autoMerged++;
      if (item.new_version && match) {
        await updateLocalVersion(match.entity_type, item.entity_id, item.new_version);
      }
      if (match?.id) processedIds.push(match.id);
    } else if (item.status === "conflict") {
      result.conflicts++;
      // Add to conflict store for UI resolution
      if (match && item.conflicting_fields) {
        addConflictFromServer(
          match.entity_type,
          item.entity_id,
          match.entity_type, // name fallback — will be resolved by UI lookup
          item.new_version ?? match.base_version,
          item.conflicting_fields,
          item.server_values ?? {},
          item.client_values ?? {},
          item.auto_merged_fields ?? [],
        );
      }
      // Keep in queue until conflict resolved
    } else {
      result.errors.push(`${item.entity_id}: unknown status ${item.status}`);
      if (match?.id) processedIds.push(match.id);
    }
  }

  if (processedIds.length > 0) {
    await clearPendingChanges(processedIds);
  }

  return result;
}

/** Update local entity version after successful push */
async function updateLocalVersion(
  entityType: string,
  entityId: string,
  newVersion: number,
): Promise<void> {
  const tableMap: Record<string, string> = {
    collection: "collections",
    folder: "folders",
    request: "requests",
    environment: "environments",
  };
  const tableName = tableMap[entityType] ?? `${entityType}s`;
  await db.table(tableName).update(entityId, { version: newVersion });
}
