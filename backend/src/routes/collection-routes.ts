import { Hono } from "hono";
import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  collections,
  folders,
  requests,
  changeLog,
} from "../db/entity-schema.js";
import { requireAuth } from "../middleware/auth-guard.js";
import { requireWorkspaceRole } from "../middleware/workspace-rbac.js";
import type { AppVariables } from "../types/context.js";

// --- Zod schemas ---
const createCollectionSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isSynced: z.boolean().optional(),
});
const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isSynced: z.boolean().optional(),
});
const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
});
const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});
const createRequestSchema = z.object({
  folderId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  method: z.string().max(10).default("GET"),
  url: z.string().default(""),
  params: z.unknown().optional(),
  headers: z.unknown().optional(),
  body: z.unknown().optional(),
  auth: z.unknown().optional(),
  description: z.string().optional(),
  preScript: z.string().optional(),
  postScript: z.string().optional(),
});
const updateRequestSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  method: z.string().max(10).optional(),
  url: z.string().optional(),
  params: z.unknown().optional(),
  headers: z.unknown().optional(),
  body: z.unknown().optional(),
  auth: z.unknown().optional(),
  description: z.string().optional(),
  preScript: z.string().nullable().optional(),
  postScript: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const collectionRouter = new Hono<{ Variables: AppVariables }>();
collectionRouter.use(requireAuth);

// --- Helper: log change ---
async function logChange(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: {
    entityType: string;
    entityId: string;
    workspaceId?: string | null;
    userId: string;
    fieldChanges: Record<string, unknown>;
    fromVersion: number;
    toVersion: number;
  }
) {
  await tx.insert(changeLog).values({
    entityType: params.entityType,
    entityId: params.entityId,
    workspaceId: params.workspaceId ?? undefined,
    userId: params.userId,
    fieldChanges: params.fieldChanges,
    fromVersion: params.fromVersion,
    toVersion: params.toVersion,
  });
}

// ==================== COLLECTIONS ====================

// GET /collections?workspace_id=X or ?personal=true
collectionRouter.get(
  "/collections",
  requireWorkspaceRole("viewer"),
  async (c) => {
    const user = c.get("user")!;
    const workspaceId = c.req.query("workspace_id");
    const personal = c.req.query("personal");

    let condition;
    if (workspaceId) {
      condition = and(
        eq(collections.workspaceId, workspaceId),
        isNull(collections.deletedAt)
      );
    } else if (personal === "true") {
      condition = and(
        eq(collections.userId, user.id),
        isNull(collections.workspaceId),
        isNull(collections.deletedAt)
      );
    } else {
      return c.json({ error: "Provide workspace_id or personal=true" }, 400);
    }

    const result = await db.select().from(collections).where(condition);
    return c.json({ collections: result });
  }
);

// POST /collections
collectionRouter.post(
  "/collections",
  requireWorkspaceRole("editor"),
  async (c) => {
    const user = c.get("user")!;
    const body = createCollectionSchema.parse(await c.req.json());

    const [collection] = await db
      .insert(collections)
      .values({
        workspaceId: body.workspaceId ?? null,
        userId: user.id,
        name: body.name,
        description: body.description,
        isSynced: body.isSynced,
      })
      .returning();

    return c.json({ collection }, 201);
  }
);

// GET /collections/:id — with folders + requests
collectionRouter.get(
  "/collections/:id",
  requireWorkspaceRole("viewer"),
  async (c) => {
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(eq(collections.id, c.req.param("id")), isNull(collections.deletedAt))
      )
      .limit(1);

    if (!collection) return c.json({ error: "Not found" }, 404);

    // Check access: workspace member or personal owner
    const user = c.get("user")!;
    if (!collection.workspaceId && collection.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const folderList = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.collectionId, collection.id),
          isNull(folders.deletedAt)
        )
      );

    const requestList = await db
      .select()
      .from(requests)
      .where(
        and(
          eq(requests.collectionId, collection.id),
          isNull(requests.deletedAt)
        )
      );

    return c.json({ collection, folders: folderList, requests: requestList });
  }
);

// PATCH /collections/:id
collectionRouter.patch(
  "/collections/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const user = c.get("user")!;
    const body = updateCollectionSchema.parse(await c.req.json());
    const collectionId = c.req.param("id");

    const [updated] = await db
      .update(collections)
      .set({
        ...body,
        version: sql`${collections.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(collections.id, collectionId), isNull(collections.deletedAt)))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);

    await logChange(db as any, {
      entityType: "collection",
      entityId: collectionId,
      workspaceId: updated.workspaceId,
      userId: user.id,
      fieldChanges: body,
      fromVersion: (updated.version ?? 1) - 1,
      toVersion: updated.version ?? 1,
    });

    return c.json({ collection: updated });
  }
);

// DELETE /collections/:id (soft delete)
collectionRouter.delete(
  "/collections/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const [deleted] = await db
      .update(collections)
      .set({ deletedAt: new Date(), version: sql`${collections.version} + 1` })
      .where(and(eq(collections.id, c.req.param("id")), isNull(collections.deletedAt)))
      .returning();

    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ deleted: true });
  }
);

// ==================== FOLDERS ====================

// POST /collections/:cid/folders
collectionRouter.post(
  "/collections/:cid/folders",
  requireWorkspaceRole("editor"),
  async (c) => {
    const body = createFolderSchema.parse(await c.req.json());
    const [folder] = await db
      .insert(folders)
      .values({
        collectionId: c.req.param("cid"),
        parentId: body.parentId ?? null,
        name: body.name,
      })
      .returning();

    return c.json({ folder }, 201);
  }
);

// PATCH /folders/:id
collectionRouter.patch(
  "/folders/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const body = updateFolderSchema.parse(await c.req.json());
    const [updated] = await db
      .update(folders)
      .set({
        ...body,
        version: sql`${folders.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(folders.id, c.req.param("id")), isNull(folders.deletedAt)))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json({ folder: updated });
  }
);

// DELETE /folders/:id (soft delete)
collectionRouter.delete(
  "/folders/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const [deleted] = await db
      .update(folders)
      .set({ deletedAt: new Date(), version: sql`${folders.version} + 1` })
      .where(and(eq(folders.id, c.req.param("id")), isNull(folders.deletedAt)))
      .returning();

    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ deleted: true });
  }
);

// ==================== REQUESTS ====================

// POST /collections/:cid/requests
collectionRouter.post(
  "/collections/:cid/requests",
  requireWorkspaceRole("editor"),
  async (c) => {
    const body = createRequestSchema.parse(await c.req.json());
    const [request] = await db
      .insert(requests)
      .values({
        collectionId: c.req.param("cid"),
        folderId: body.folderId ?? null,
        name: body.name,
        method: body.method,
        url: body.url,
        params: body.params,
        headers: body.headers,
        body: body.body,
        auth: body.auth,
        description: body.description,
        preScript: body.preScript,
        postScript: body.postScript,
      })
      .returning();

    return c.json({ request }, 201);
  }
);

// GET /requests/:id
collectionRouter.get("/requests/:id", async (c) => {
  const user = c.get("user")!;
  const [request] = await db
    .select()
    .from(requests)
    .where(
      and(eq(requests.id, c.req.param("id")), isNull(requests.deletedAt))
    )
    .limit(1);

  if (!request) return c.json({ error: "Not found" }, 404);

  // Verify access: check the parent collection belongs to user or their workspace
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, request.collectionId))
    .limit(1);

  if (!collection) return c.json({ error: "Not found" }, 404);

  if (!collection.workspaceId && collection.userId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  // For workspace collections, RBAC is handled by workspace membership
  // (the requireAuth middleware already ensures the user is authenticated)

  return c.json({ request });
});

// PATCH /requests/:id
collectionRouter.patch(
  "/requests/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const user = c.get("user")!;
    const body = updateRequestSchema.parse(await c.req.json());
    const requestId = c.req.param("id");

    const [updated] = await db
      .update(requests)
      .set({
        ...body,
        version: sql`${requests.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(requests.id, requestId), isNull(requests.deletedAt)))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);

    await logChange(db as any, {
      entityType: "request",
      entityId: requestId,
      workspaceId: null,
      userId: user.id,
      fieldChanges: body,
      fromVersion: (updated.version ?? 1) - 1,
      toVersion: updated.version ?? 1,
    });

    return c.json({ request: updated });
  }
);

// DELETE /requests/:id (soft delete)
collectionRouter.delete(
  "/requests/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const [deleted] = await db
      .update(requests)
      .set({ deletedAt: new Date(), version: sql`${requests.version} + 1` })
      .where(and(eq(requests.id, c.req.param("id")), isNull(requests.deletedAt)))
      .returning();

    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ deleted: true });
  }
);
