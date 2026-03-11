import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { workspaceMembers } from "../db/workspace-schema.js";
import type { AppVariables } from "../types/context.js";

export type WorkspaceRole = "owner" | "editor" | "viewer";

const ROLE_LEVELS: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

/** Check user has at least `minRole` in the workspace.
 *  Reads workspace_id from route param `:workspaceId` or query `workspace_id`.
 *  Does NOT read `:id` to avoid confusing entity IDs with workspace IDs. */
export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return createMiddleware<{
    Variables: AppVariables & { workspaceRole: WorkspaceRole };
  }>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const workspaceId =
      c.req.param("workspaceId") || c.req.query("workspace_id");

    // No workspace = personal resource, skip RBAC
    if (!workspaceId) return next();

    const member = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.id)
        )
      )
      .limit(1);

    if (
      !member[0] ||
      ROLE_LEVELS[member[0].role as WorkspaceRole] < ROLE_LEVELS[minRole]
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }

    c.set("workspaceRole", member[0].role as WorkspaceRole);
    return next();
  });
}