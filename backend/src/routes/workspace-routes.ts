import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-guard.js";
import { requireWorkspaceRole } from "../middleware/workspace-rbac.js";
import {
  createWorkspace,
  getWorkspaceById,
  listUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  removeMember,
  changeMemberRole,
} from "../services/workspace-service.js";
import { createInvite, acceptInvite } from "../services/invite-service.js";
import type { AppVariables } from "../types/context.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
});
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]).default("editor"),
});
const roleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export const workspaceRouter = new Hono<{ Variables: AppVariables }>();
workspaceRouter.use(requireAuth);

// GET /workspaces -- list user's workspaces
workspaceRouter.get("/workspaces", async (c) => {
  const user = c.get("user")!;
  const list = await listUserWorkspaces(user.id);
  return c.json({ workspaces: list });
});

// POST /workspaces -- create workspace
workspaceRouter.post("/workspaces", async (c) => {
  const user = c.get("user")!;
  const body = createSchema.parse(await c.req.json());
  const workspace = await createWorkspace({ ...body, ownerId: user.id });
  return c.json({ workspace }, 201);
});

// GET /workspaces/:workspaceId -- get workspace details + members
workspaceRouter.get(
  "/workspaces/:workspaceId",
  requireWorkspaceRole("viewer"),
  async (c) => {
    const workspace = await getWorkspaceById(c.req.param("workspaceId"));
    if (!workspace) return c.json({ error: "Not found" }, 404);
    return c.json({ workspace });
  }
);

// PATCH /workspaces/:workspaceId -- update workspace (owner only)
workspaceRouter.patch(
  "/workspaces/:workspaceId",
  requireWorkspaceRole("owner"),
  async (c) => {
    const body = updateSchema.parse(await c.req.json());
    const workspace = await updateWorkspace(c.req.param("workspaceId"), body);
    return c.json({ workspace });
  }
);

// DELETE /workspaces/:workspaceId -- delete workspace (owner only)
workspaceRouter.delete(
  "/workspaces/:workspaceId",
  requireWorkspaceRole("owner"),
  async (c) => {
    await deleteWorkspace(c.req.param("workspaceId"));
    return c.json({ deleted: true });
  }
);

// POST /workspaces/:workspaceId/invite -- create invite link
workspaceRouter.post(
  "/workspaces/:workspaceId/invite",
  requireWorkspaceRole("owner"),
  async (c) => {
    const user = c.get("user")!;
    const body = inviteSchema.parse(await c.req.json());
    const invite = await createInvite({
      workspaceId: c.req.param("workspaceId"),
      email: body.email,
      role: body.role,
      invitedBy: user.id,
    });
    return c.json(
      { invite: { token: invite.token, expiresAt: invite.expiresAt } },
      201
    );
  }
);

// POST /workspaces/:workspaceId/join/:token -- accept invite
workspaceRouter.post(
  "/workspaces/:workspaceId/join/:token",
  async (c) => {
    const user = c.get("user")!;
    const result = await acceptInvite(c.req.param("token"), user.id);
    if ("error" in result) return c.json({ error: result.error }, 400);
    return c.json({ joined: true, ...result });
  }
);

// DELETE /workspaces/:workspaceId/members/:uid -- remove member (owner only)
workspaceRouter.delete(
  "/workspaces/:workspaceId/members/:uid",
  requireWorkspaceRole("owner"),
  async (c) => {
    const targetUid = c.req.param("uid");
    const wsId = c.req.param("workspaceId");
    const workspace = await getWorkspaceById(wsId);
    // Cannot remove the owner
    if (workspace?.ownerId === targetUid) {
      return c.json({ error: "Cannot remove workspace owner" }, 400);
    }
    await removeMember(wsId, targetUid);
    return c.json({ removed: true });
  }
);

// PATCH /workspaces/:workspaceId/members/:uid -- change role (owner only)
workspaceRouter.patch(
  "/workspaces/:workspaceId/members/:uid",
  requireWorkspaceRole("owner"),
  async (c) => {
    const wsId = c.req.param("workspaceId");
    const targetUid = c.req.param("uid");
    // Cannot change the owner's role
    const workspace = await getWorkspaceById(wsId);
    if (workspace?.ownerId === targetUid) {
      return c.json({ error: "Cannot change workspace owner role" }, 400);
    }
    const body = roleSchema.parse(await c.req.json());
    const updated = await changeMemberRole(wsId, targetUid, body.role);
    if (!updated) return c.json({ error: "Member not found" }, 404);
    return c.json({ member: updated });
  }
);
