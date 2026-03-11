import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  workspaces,
  workspaceMembers,
} from "../db/workspace-schema.js";

/** Create workspace + add owner as first member */
export async function createWorkspace(params: {
  name: string;
  slug: string;
  ownerId: string;
}) {
  const [workspace] = await db.transaction(async (tx) => {
    const [ws] = await tx
      .insert(workspaces)
      .values({
        name: params.name,
        slug: params.slug,
        ownerId: params.ownerId,
      })
      .returning();

    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId: params.ownerId,
      role: "owner",
    });

    return [ws];
  });

  return workspace;
}

/** Get workspace with member count */
export async function getWorkspaceById(workspaceId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) return null;

  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return { ...workspace, members };
}

/** List workspaces the user belongs to */
export async function listUserWorkspaces(userId: string) {
  const memberships = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      name: workspaces.name,
      slug: workspaces.slug,
      ownerId: workspaces.ownerId,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  return memberships;
}

/** Update workspace (name/slug). Owner only. */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; slug?: string }
) {
  const [updated] = await db
    .update(workspaces)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return updated;
}

/** Delete workspace. Owner only. */
export async function deleteWorkspace(workspaceId: string) {
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}

/** Remove a member from workspace */
export async function removeMember(workspaceId: string, userId: string) {
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
}

/** Change member role */
export async function changeMemberRole(
  workspaceId: string,
  userId: string,
  role: string
) {
  const [updated] = await db
    .update(workspaceMembers)
    .set({ role })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .returning();
  return updated;
}
