/**
 * Migration script: userFiles blob → normalized entity tables
 * Run once via: pnpm db:migrate-data
 *
 * Parses JSON blobs from userFiles table and inserts into
 * collections, folders, requests, environments tables.
 * Personal collections (workspace_id = null).
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { userFiles } from "../db/schema.js";
import { collections, folders, requests, environments } from "../db/entity-schema.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function migrate() {
  console.log("Starting userFiles → entity migration...");

  const allFiles = await db.select().from(userFiles);
  console.log(`Found ${allFiles.length} userFiles records`);

  let collectionCount = 0;
  let folderCount = 0;
  let requestCount = 0;
  let envCount = 0;

  for (const file of allFiles) {
    const content = file.content as Record<string, unknown>;

    if (file.entityType === "collection") {
      await migrateCollection(file.userId, content);
      collectionCount++;
    } else if (file.entityType === "environment") {
      await migrateEnvironment(file.userId, content);
      envCount++;
    }
  }

  console.log(`Migration complete:
  Collections: ${collectionCount}
  Folders: ${folderCount}
  Requests: ${requestCount}
  Environments: ${envCount}`);

  await client.end();
}

async function migrateCollection(
  userId: string,
  content: Record<string, unknown>
) {
  const name = (content.name as string) || "Unnamed Collection";
  const description = content.description as string | undefined;
  const items = (content.requests as any[]) || [];
  const folderItems = (content.folders as any[]) || [];

  // Insert collection
  const [col] = await db
    .insert(collections)
    .values({
      id: content.id as string | undefined,
      userId,
      workspaceId: null,
      name,
      description,
      isSynced: true,
    })
    .returning();

  // Insert folders
  const folderIdMap = new Map<string, string>();
  for (const f of folderItems) {
    const [folder] = await db
      .insert(folders)
      .values({
        id: f.id,
        collectionId: col.id,
        parentId: f.parentId || null,
        name: f.name || "Unnamed Folder",
        sortOrder: f.sortOrder ?? 0,
      })
      .returning();
    folderIdMap.set(f.id, folder.id);
  }

  // Insert requests
  for (const r of items) {
    await db.insert(requests).values({
      id: r.id,
      collectionId: col.id,
      folderId: r.folderId ? (folderIdMap.get(r.folderId) ?? null) : null,
      name: r.name || "Unnamed Request",
      method: r.method || "GET",
      url: r.url || "",
      params: r.params,
      headers: r.headers,
      body: r.body,
      auth: r.auth,
      description: r.description,
      preScript: r.preScript,
      postScript: r.postScript,
      sortOrder: r.sortOrder ?? 0,
    });
  }
}

async function migrateEnvironment(
  userId: string,
  content: Record<string, unknown>
) {
  await db.insert(environments).values({
    id: content.id as string | undefined,
    userId,
    workspaceId: null,
    name: (content.name as string) || "Unnamed Environment",
    variables: content.variables ?? [],
    isActive: (content.isActive as boolean) ?? false,
    isSynced: true,
  });
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
