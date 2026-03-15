import { Hono } from "hono";
import { z } from "zod";
import { eq, and, gt, isNull, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  collections,
  folders,
  requests,
  environments,
  changeLog,
} from "../db/entity-schema.js";
import { requireAuth } from "../middleware/auth-guard.js";
import { requireWorkspaceRole } from "../middleware/workspace-rbac.js";
import type { AppVariables } from "../types/context.js";
import { mergeEntityUpdate } from "../services/merge-engine.js";

const changesQuerySchema = z.object({
  since: z.string().datetime(),
  workspace_id: z.string().uuid().optional(),
});

const pushEntitySchema = z.object({
  entityType: z.enum(["collection", "folder", "request", "environment"]),
  id: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  version: z.number().int(),
  deleted: z.boolean().optional(),
});

const pushBodySchema = z.object({
  changes: z.array(pushEntitySchema),
});

export const entitySyncRouter = new Hono<{ Variables: AppVariables }>();
entitySyncRouter.use(requireAuth);

// Entity type → Drizzle table mapping
const entityTables = {
  collection: collections,
  folder: folders,
  request: requests,
  environment: environments,
} as const;

// Whitelist of allowed fields per entity type (prevent userId/workspaceId injection)
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  collection: new Set(["name", "description", "sortOrder", "isSynced"]),
  folder: new Set(["name", "parentId", "sortOrder"]),
  request: new Set([
    "name", "method", "url", "params", "headers", "body", "auth",
    "description", "preScript", "postScript", "sortOrder", "folderId",
  ]),
  environment: new Set(["name", "variables", "isActive", "isSynced"]),
};

/** Strip disallowed fields from data payload */
function sanitizeData(entityType: string, data: Record<string, unknown>) {
  const allowed = ALLOWED_FIELDS[entityType];
  if (!allowed) return {};
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) clean[key] = data[key];
  }
  return clean;
}

// GET /sync/changes?since=ISO&workspace_id=X
entitySyncRouter.get(
  "/sync/changes",
  requireWorkspaceRole("viewer"),
  async (c) => {
    const user = c.get("user")!;
    const query = changesQuerySchema.parse(c.req.query());
    const since = new Date(query.since);

    // Fetch changed entities from each table since timestamp
    const changedCollections = await db
      .select()
      .from(collections)
      .where(
        query.workspace_id
          ? and(
              eq(collections.workspaceId, query.workspace_id),
              gt(collections.updatedAt, since)
            )
          : and(
              eq(collections.userId, user.id),
              isNull(collections.workspaceId),
              gt(collections.updatedAt, since)
            )
      );

    // Get all collection IDs in the workspace (for scoping folders/requests)
    const wsCollections = query.workspace_id
      ? await db
          .select({ id: collections.id })
          .from(collections)
          .where(eq(collections.workspaceId, query.workspace_id))
      : await db
          .select({ id: collections.id })
          .from(collections)
          .where(
            and(
              eq(collections.userId, user.id),
              isNull(collections.workspaceId)
            )
          );

    const allCollectionIds = wsCollections.map((c) => c.id);

    const changedFolders = allCollectionIds.length > 0
      ? await db
          .select()
          .from(folders)
          .where(
            and(
              inArray(folders.collectionId, allCollectionIds),
              gt(folders.updatedAt, since)
            )
          )
      : [];

    const changedRequests = allCollectionIds.length > 0
      ? await db
          .select()
          .from(requests)
          .where(
            and(
              inArray(requests.collectionId, allCollectionIds),
              gt(requests.updatedAt, since)
            )
          )
      : [];

    const changedEnvironments = await db
      .select()
      .from(environments)
      .where(
        query.workspace_id
          ? and(
              eq(environments.workspaceId, query.workspace_id),
              gt(environments.updatedAt, since)
            )
          : and(
              eq(environments.userId, user.id),
              isNull(environments.workspaceId),
              gt(environments.updatedAt, since)
            )
      );

    return c.json({
      collections: changedCollections,
      folders: changedFolders,
      requests: changedRequests,
      environments: changedEnvironments,
      serverTime: new Date().toISOString(),
    });
  }
);

// Per-entity result shape for push responses
interface SyncPushResult {
  entity_id: string;
  status: "ok" | "conflict" | "error";
  new_version?: number;
  message?: string;
  // Merge details
  auto_merged_fields?: string[];
  conflicting_fields?: string[];
  server_values?: Record<string, unknown>;
  client_values?: Record<string, unknown>;
}

// POST /sync/push — batch upsert entity changes via field-level merge engine
entitySyncRouter.post(
  "/sync/push",
  requireWorkspaceRole("editor"),
  async (c) => {
    const user = c.get("user")!;
    const body = pushBodySchema.parse(await c.req.json());

    // Extract workspace_id from query or first change (best-effort scoping)
    const workspaceId = (c.req.query("workspace_id") as string | undefined) ?? null;

    const entityResults: SyncPushResult[] = [];

    for (const change of body.changes) {
      const table = entityTables[change.entityType];
      if (!table) {
        entityResults.push({
          entity_id: change.id,
          status: "error",
          message: `Unknown entity type: ${change.entityType}`,
        });
        continue;
      }

      try {
        if (change.deleted) {
          // Soft delete — keep simple, no merge needed
          await db.transaction(async (tx) => {
            await tx
              .update(table)
              .set({
                deletedAt: new Date(),
                version: sql`${table.version} + 1`,
                updatedAt: new Date(),
              } as any)
              .where(eq(table.id, change.id));
          });
          entityResults.push({ entity_id: change.id, status: "ok" });
          continue;
        }

        // Check if entity exists
        const [existing] = await db
          .select({ version: table.version })
          .from(table)
          .where(eq(table.id, change.id))
          .limit(1);

        if (!existing) {
          // Insert new entity — no merge needed
          const safeData = sanitizeData(change.entityType, change.data);
          await db.transaction(async (tx) => {
            await tx.insert(table).values({
              id: change.id,
              ...safeData,
              userId: user.id,
              version: change.version,
            } as any);
            // Log creation
            await tx.insert(changeLog).values({
              entityType: change.entityType,
              entityId: change.id,
              userId: user.id,
              fieldChanges: safeData,
              fromVersion: 0,
              toVersion: change.version,
              workspaceId: workspaceId ?? null,
            });
          });
          entityResults.push({
            entity_id: change.id,
            status: "ok",
            new_version: change.version,
          });
          continue;
        }

        // Update existing — use merge engine
        const mergeResult = await mergeEntityUpdate(
          change.entityType,
          change.id,
          change.version,
          change.data,
          user.id,
          workspaceId,
        );

        if (mergeResult.status === "conflict") {
          entityResults.push({
            entity_id: change.id,
            status: "conflict",
            new_version: mergeResult.version,
            auto_merged_fields: mergeResult.autoMergedFields,
            conflicting_fields: mergeResult.conflictingFields,
            server_values: mergeResult.serverValues,
            client_values: mergeResult.clientValues,
          });
        } else {
          entityResults.push({
            entity_id: change.id,
            status: "ok",
            new_version: mergeResult.version,
            auto_merged_fields: mergeResult.autoMergedFields,
          });
        }
      } catch (err) {
        entityResults.push({
          entity_id: change.id,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const synced = entityResults.filter((r) => r.status === "ok").length;
    const conflicts = entityResults.filter((r) => r.status === "conflict").length;
    const errors = entityResults
      .filter((r) => r.status === "error")
      .map((r) => r.message ?? "error");

    return c.json({
      synced,
      conflicts,
      errors,
      results: entityResults,
      serverTime: new Date().toISOString(),
    });
  }
);
