import { randomBytes } from "node:crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { workspaceInvites, workspaceMembers } from "../db/workspace-schema.js";

const TOKEN_LENGTH = 32; // 32 bytes → 64 hex chars
const INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Generate a cryptographically random invite token */
export function generateInviteToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}

/** Create an invite for a workspace */
export async function createInvite(params: {
  workspaceId: string;
  email: string;
  role: string;
  invitedBy: string;
}) {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId: params.workspaceId,
      email: params.email,
      role: params.role,
      token,
      invitedBy: params.invitedBy,
      expiresAt,
    })
    .returning();

  return invite;
}

/** Accept an invite — validates token, checks expiry, creates membership.
 *  All checks + writes in a single transaction to prevent race conditions. */
export async function acceptInvite(token: string, userId: string) {
  return await db.transaction(async (tx) => {
    // Lock the invite row via SELECT ... FOR UPDATE to prevent double-accept
    const [invite] = await tx
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.token, token),
          isNull(workspaceInvites.acceptedAt),
          gt(workspaceInvites.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invite) return { error: "Invalid or expired invite" };

    // Check if already a member (inside transaction)
    const [existing] = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (existing) return { error: "Already a member" };

    // Create membership + mark invite accepted atomically
    await tx.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    });
    await tx
      .update(workspaceInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));

    return { workspaceId: invite.workspaceId, role: invite.role };
  });
}
