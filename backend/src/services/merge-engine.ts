/**
 * Field-level merge engine — resolves concurrent entity updates with
 * three outcomes: direct apply, auto-merge, or conflict.
 *
 * Merge paths:
 *   server.version === baseVersion  → direct apply (no divergence)
 *   server.version > baseVersion    → compare changed field sets
 *     no overlap  → auto-merge (apply client changes on top)
 *     overlap     → conflict (return conflicting fields; auto-merge the rest)
 */
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  collections,
  folders,
  requests,
  environments,
} from "../db/entity-schema.js";
import { writeChangeLog, getChangesSince } from "./change-log-service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergeResult {
  status: "applied" | "auto_merged" | "conflict";
  version: number;
  autoMergedFields?: string[];
  conflictingFields?: string[];
  serverValues?: Record<string, unknown>;
  clientValues?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Entity table registry (mirrors entity-sync-routes.ts)
// ---------------------------------------------------------------------------

const entityTables = {
  collection: collections,
  folder: folders,
  request: requests,
  environment: environments,
} as const;

type EntityType = keyof typeof entityTables;

// ---------------------------------------------------------------------------
// Allowed fields whitelist (duplicated from entity-sync-routes to keep
// merge-engine self-contained and avoid circular imports)
// ---------------------------------------------------------------------------

const ALLOWED_FIELDS: Record<EntityType, Set<string>> = {
  collection: new Set(["name", "description", "sortOrder", "isSynced"]),
  folder: new Set(["name", "parentId", "sortOrder"]),
  request: new Set([
    "name", "method", "url", "params", "headers", "body", "auth",
    "description", "preScript", "postScript", "sortOrder", "folderId",
  ]),
  environment: new Set(["name", "variables", "isActive", "isSynced"]),
};

/** Strip fields not in whitelist */
function sanitize(
  entityType: EntityType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = ALLOWED_FIELDS[entityType];
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) clean[key] = data[key];
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Core merge function
// ---------------------------------------------------------------------------

/**
 * Merge a client update into the server entity.
 *
 * @param entityType  - One of collection | folder | request | environment
 * @param entityId    - UUID of the entity
 * @param baseVersion - Client's last-known server version
 * @param clientData  - Field changes from client (already sanitized is fine,
 *                      will be re-sanitized internally for safety)
 * @param userId      - ID of the user performing the update
 * @param workspaceId - Optional workspace context for change-log scoping
 */
export async function mergeEntityUpdate(
  entityType: string,
  entityId: string,
  baseVersion: number,
  clientData: Record<string, unknown>,
  userId: string,
  workspaceId?: string | null,
): Promise<MergeResult> {
  if (!(entityType in entityTables)) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const type = entityType as EntityType;
  const table = entityTables[type];
  const safeClientData = sanitize(type, clientData);
  const clientFields = new Set(Object.keys(safeClientData));

  return db.transaction(async (tx) => {
    // Fetch current server row
    const [current] = await tx
      .select()
      .from(table)
      .where(eq(table.id, entityId))
      .limit(1);

    if (!current) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const serverVersion: number = (current as any).version ?? 0;

    // --- Path 1: direct apply (no divergence) ---
    if (serverVersion === baseVersion) {
      const newVersion = serverVersion + 1;
      await tx
        .update(table)
        .set({
          ...safeClientData,
          version: sql`${table.version} + 1`,
          updatedAt: new Date(),
        } as any)
        .where(eq(table.id, entityId));

      await writeChangeLog(
        tx,
        entityType,
        entityId,
        safeClientData,
        serverVersion,
        newVersion,
        userId,
        workspaceId,
      );

      return { status: "applied", version: newVersion };
    }

    // --- Path 2/3: server has advanced — analyse field overlap ---
    const serverChangeLogs = await getChangesSince(entityId, baseVersion);

    // Collect all fields the server touched since baseVersion
    const serverChangedFields = new Set<string>();
    for (const entry of serverChangeLogs) {
      const fields = entry.fieldChanges as Record<string, unknown> | null;
      if (fields) {
        for (const f of Object.keys(fields)) serverChangedFields.add(f);
      }
    }

    const conflictingFields: string[] = [];
    const autoMergedFields: string[] = [];

    for (const field of clientFields) {
      if (serverChangedFields.has(field)) {
        conflictingFields.push(field);
      } else {
        autoMergedFields.push(field);
      }
    }

    // Build the non-conflicting patch to apply
    const patchData: Record<string, unknown> = {};
    for (const field of autoMergedFields) {
      patchData[field] = safeClientData[field];
    }

    const newVersion = serverVersion + 1;

    if (conflictingFields.length === 0) {
      // --- Path 2: auto-merge — no overlapping fields ---
      await tx
        .update(table)
        .set({
          ...patchData,
          version: sql`${table.version} + 1`,
          updatedAt: new Date(),
        } as any)
        .where(eq(table.id, entityId));

      await writeChangeLog(
        tx,
        entityType,
        entityId,
        patchData,
        serverVersion,
        newVersion,
        userId,
        workspaceId,
      );

      return {
        status: "auto_merged",
        version: newVersion,
        autoMergedFields,
      };
    }

    // --- Path 3: conflict — apply non-overlapping fields, report conflicts ---
    // Collect current server values for conflicting fields (from the live row)
    const serverValues: Record<string, unknown> = {};
    const clientValues: Record<string, unknown> = {};
    for (const field of conflictingFields) {
      serverValues[field] = (current as any)[field];
      clientValues[field] = safeClientData[field];
    }

    // Still apply non-conflicting fields if any
    if (autoMergedFields.length > 0) {
      await tx
        .update(table)
        .set({
          ...patchData,
          version: sql`${table.version} + 1`,
          updatedAt: new Date(),
        } as any)
        .where(eq(table.id, entityId));

      await writeChangeLog(
        tx,
        entityType,
        entityId,
        patchData,
        serverVersion,
        newVersion,
        userId,
        workspaceId,
      );
    }

    return {
      status: "conflict",
      // Return current server version; if we applied a partial patch, bump it
      version: autoMergedFields.length > 0 ? newVersion : serverVersion,
      autoMergedFields: autoMergedFields.length > 0 ? autoMergedFields : undefined,
      conflictingFields,
      serverValues,
      clientValues,
    };
  });
}
