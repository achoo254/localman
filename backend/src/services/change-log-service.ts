/**
 * Change log service — write and query field-level changes for merge decisions.
 */
import { eq, and, gt } from "drizzle-orm";
import { changeLog } from "../db/entity-schema.js";
import { db } from "../db/client.js";

/** Write a change log entry within a transaction */
export async function writeChangeLog(
  tx: any, // drizzle transaction
  entityType: string,
  entityId: string,
  fieldChanges: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
  userId: string,
  workspaceId?: string | null,
): Promise<void> {
  await tx.insert(changeLog).values({
    entityType,
    entityId,
    fieldChanges,
    fromVersion,
    toVersion,
    userId,
    workspaceId: workspaceId ?? null,
  });
}

/** Get field-level changes since a specific version for an entity */
export async function getChangesSince(
  entityId: string,
  sinceVersion: number,
): Promise<Array<{ fieldChanges: unknown; fromVersion: number; toVersion: number; userId: string }>> {
  return db
    .select({
      fieldChanges: changeLog.fieldChanges,
      fromVersion: changeLog.fromVersion,
      toVersion: changeLog.toVersion,
      userId: changeLog.userId,
    })
    .from(changeLog)
    .where(
      and(
        eq(changeLog.entityId, entityId),
        gt(changeLog.fromVersion, sinceVersion),
      ),
    )
    .orderBy(changeLog.fromVersion);
}
