import { Hono } from "hono";
import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { environments, changeLog } from "../db/entity-schema.js";
import { requireAuth } from "../middleware/auth-guard.js";
import { requireWorkspaceRole } from "../middleware/workspace-rbac.js";
import type { AppVariables } from "../types/context.js";

const createSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  variables: z.unknown().default([]),
  isActive: z.boolean().optional(),
  isSynced: z.boolean().optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  variables: z.unknown().optional(),
  isActive: z.boolean().optional(),
  isSynced: z.boolean().optional(),
});

export const environmentRouter = new Hono<{ Variables: AppVariables }>();
environmentRouter.use(requireAuth);

// GET /environments?workspace_id=X or ?personal=true
environmentRouter.get(
  "/environments",
  requireWorkspaceRole("viewer"),
  async (c) => {
    const user = c.get("user")!;
    const workspaceId = c.req.query("workspace_id");
    const personal = c.req.query("personal");

    let condition;
    if (workspaceId) {
      condition = and(
        eq(environments.workspaceId, workspaceId),
        isNull(environments.deletedAt)
      );
    } else if (personal === "true") {
      condition = and(
        eq(environments.userId, user.id),
        isNull(environments.workspaceId),
        isNull(environments.deletedAt)
      );
    } else {
      return c.json(
        { error: "Provide workspace_id or personal=true" },
        400
      );
    }

    const result = await db.select().from(environments).where(condition);
    return c.json({ environments: result });
  }
);

// POST /environments
environmentRouter.post(
  "/environments",
  requireWorkspaceRole("editor"),
  async (c) => {
    const user = c.get("user")!;
    const body = createSchema.parse(await c.req.json());

    const [env] = await db
      .insert(environments)
      .values({
        workspaceId: body.workspaceId ?? null,
        userId: user.id,
        name: body.name,
        variables: body.variables,
        isActive: body.isActive,
        isSynced: body.isSynced,
      })
      .returning();

    return c.json({ environment: env }, 201);
  }
);

// PATCH /environments/:id
environmentRouter.patch(
  "/environments/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const user = c.get("user")!;
    const body = updateSchema.parse(await c.req.json());
    const envId = c.req.param("id");

    const [updated] = await db
      .update(environments)
      .set({
        ...body,
        version: sql`${environments.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(environments.id, envId), isNull(environments.deletedAt)))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);

    await db.insert(changeLog).values({
      entityType: "environment",
      entityId: envId,
      workspaceId: updated.workspaceId ?? undefined,
      userId: user.id,
      fieldChanges: body,
      fromVersion: (updated.version ?? 1) - 1,
      toVersion: updated.version ?? 1,
    });

    return c.json({ environment: updated });
  }
);

// DELETE /environments/:id (soft delete)
environmentRouter.delete(
  "/environments/:id",
  requireWorkspaceRole("editor"),
  async (c) => {
    const [deleted] = await db
      .update(environments)
      .set({
        deletedAt: new Date(),
        version: sql`${environments.version} + 1`,
      })
      .where(
        and(
          eq(environments.id, c.req.param("id")),
          isNull(environments.deletedAt)
        )
      )
      .returning();

    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ deleted: true });
  }
);
