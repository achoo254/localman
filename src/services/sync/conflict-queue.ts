/**
 * Conflict queue — parses conflict responses from server (WS or HTTP),
 * adds to conflict store, and handles conflict resolution submissions.
 */

import { useConflictStore, type FieldResolution } from "../../stores/conflict-store";
import { getHttpClient } from "../../utils/tauri-http-client";
import { getIdToken } from "./firebase-auth-client";
import { getApiBaseUrl } from "../../utils/api-base-url";

/** Parse a server conflict response and add to conflict store */
export function addConflictFromServer(
  entityType: string,
  entityId: string,
  entityName: string,
  serverVersion: number,
  conflictingFields: string[],
  serverValues: Record<string, unknown>,
  clientValues: Record<string, unknown>,
  autoMergedFields: string[] = [],
): void {
  useConflictStore.getState().addConflict({
    id: `${entityType}:${entityId}:${Date.now()}`,
    entityType,
    entityId,
    entityName,
    conflictingFields,
    serverValues,
    clientValues,
    serverVersion,
    autoMergedFields,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Resolve a conflict by sending chosen field values to server.
 * Builds a merged payload from per-field resolutions and pushes as entity:update.
 */
export async function resolveConflict(
  conflictId: string,
  entityType: string,
  entityId: string,
  serverVersion: number,
  fieldResolutions: Record<string, FieldResolution>,
  serverValues: Record<string, unknown>,
  clientValues: Record<string, unknown>,
): Promise<void> {
  // Build merged data from per-field choices
  const resolvedData: Record<string, unknown> = {};
  for (const [field, choice] of Object.entries(fieldResolutions)) {
    resolvedData[field] = choice === "server" ? serverValues[field] : clientValues[field];
  }

  // Push resolution as entity update
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  const f = await getHttpClient();
  const res = await f(`${getApiBaseUrl()}/api/sync/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      changes: [
        {
          entityType,
          id: entityId,
          data: resolvedData,
          version: serverVersion,
          deleted: false,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Conflict resolution push failed: ${res.status}`);
  }

  // Remove from conflict store
  useConflictStore.getState().removeConflict(conflictId);
}
