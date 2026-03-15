import { Hono } from "hono";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { userFiles } from "../db/schema.js";
import { requireAuth } from "../middleware/auth-guard.js";
import type { AppVariables } from "../types/context.js";

const pullQuerySchema = z.object({
  since: z.string().datetime().optional(),
  type: z.enum(["collection", "environment"]).optional(),
});

const pushBodySchema = z.object({
  changes: z
    .array(
      z.object({
        filename: z.string().min(1).max(255),
        entityType: z.enum(["collection", "environment"]),
        content: z.record(z.string(), z.unknown()),
        updatedAt: z.string().datetime(),
      })
    )
    .default([]),
  deletions: z.array(z.string().min(1).max(255)).default([]),
});

export const syncRouter = new Hono<{ Variables: AppVariables }>();

syncRouter.use(requireAuth);

// GET /sync/pull — returns user's files, optionally filtered by since/type
syncRouter.get("/sync/pull", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const parseResult = pullQuerySchema.safeParse(c.req.query());
  if (!parseResult.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  const query = parseResult.data;

  const conditions = [eq(userFiles.userId, user.id)];

  if (query.since) {
    conditions.push(gt(userFiles.updatedAt, new Date(query.since)));
  }
  if (query.type) {
    conditions.push(eq(userFiles.entityType, query.type));
  }

  const files = await db
    .select({
      filename: userFiles.filename,
      entityType: userFiles.entityType,
      content: userFiles.content,
      updatedAt: userFiles.updatedAt,
    })
    .from(userFiles)
    .where(and(...conditions));

  return c.json({
    files: files.map((f) => ({
      ...f,
      updatedAt: f.updatedAt.toISOString(),
    })),
    serverTime: new Date().toISOString(),
  });
});

// POST /sync/push — upsert changes + delete files in a transaction
syncRouter.post("/sync/push", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const parseResult = pushBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const body = parseResult.data;

  let synced = 0;
  let deleted = 0;

  await db.transaction(async (tx) => {
    for (const change of body.changes) {
      await tx
        .insert(userFiles)
        .values({
          userId: user.id,
          filename: change.filename,
          entityType: change.entityType,
          content: change.content,
          updatedAt: new Date(change.updatedAt),
        })
        .onConflictDoUpdate({
          target: [userFiles.userId, userFiles.filename],
          set: {
            entityType: change.entityType,
            content: change.content,
            updatedAt: new Date(change.updatedAt),
          },
        });
      synced++;
    }

    for (const filename of body.deletions) {
      await tx
        .delete(userFiles)
        .where(
          and(eq(userFiles.userId, user.id), eq(userFiles.filename, filename))
        );
      deleted++;
    }
  });

  return c.json({
    synced,
    deleted,
    serverTime: new Date().toISOString(),
  });
});
