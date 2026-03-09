/**
 * Pull/push cloud sync service using Better Auth JWT.
 * Server is a dumb JSON store — client handles LWW reconciliation.
 */

import * as settingsService from "../../db/services/settings-service";
import * as collectionService from "../../db/services/collection-service";
import * as environmentService from "../../db/services/environment-service";
import { db } from "../../db/database";
import { exportToPostman } from "../exporters/postman-exporter";
import { exportCollectionToNative } from "../exporters/native-exporter";
import { importPostmanCollection } from "../importers/postman-importer";
import { reconcile } from "./sync-service";
import type {
  CloudSyncConfig,
  SyncFile,
  SyncPullResponse,
  SyncPushPayload,
  SyncPushResponse,
} from "../../types/cloud-sync";
import {
  CLOUD_SYNC_CONFIG_KEY,
  DEFAULT_CLOUD_SYNC_CONFIG,
} from "../../types/cloud-sync";
import type { Environment } from "../../types/models";
import { getHttpClient } from "../../utils/tauri-http-client";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// --- Config persistence ---

export async function getCloudSyncConfig(): Promise<CloudSyncConfig> {
  const raw = await settingsService.get<CloudSyncConfig>(CLOUD_SYNC_CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CLOUD_SYNC_CONFIG };
  return { ...DEFAULT_CLOUD_SYNC_CONFIG, ...raw };
}

export async function saveCloudSyncConfig(
  config: CloudSyncConfig
): Promise<void> {
  await settingsService.set(CLOUD_SYNC_CONFIG_KEY, config);
}

// --- Pull/Push API ---

export async function pullFromServer(
  config: CloudSyncConfig
): Promise<SyncPullResponse> {
  if (!config.token) throw new Error("Not authenticated");
  const f = await getHttpClient();
  const url = new URL(`${config.serverUrl}/api/sync/pull`);
  if (config.lastSyncAt) url.searchParams.set("since", config.lastSyncAt);

  const res = await f(url.toString(), {
    method: "GET",
    headers: authHeaders(config.token),
  });

  if (res.status === 401)
    throw new Error("Session expired. Please login again.");
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
  return res.json() as Promise<SyncPullResponse>;
}

export async function pushToServer(
  config: CloudSyncConfig,
  payload: SyncPushPayload
): Promise<SyncPushResponse> {
  if (!config.token) throw new Error("Not authenticated");
  const f = await getHttpClient();

  const res = await f(`${config.serverUrl}/api/sync/push`, {
    method: "POST",
    headers: authHeaders(config.token),
    body: JSON.stringify(payload),
  });

  if (res.status === 401)
    throw new Error("Session expired. Please login again.");
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
  return res.json() as Promise<SyncPushResponse>;
}

// --- Health check ---

export async function checkServerHealth(
  serverUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const f = await getHttpClient();
    const res = await f(`${serverUrl}/api/health`, { method: "GET" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Full sync ---

export interface CloudSyncResult {
  uploaded: number;
  downloaded: number;
  errors: string[];
}

export async function cloudSyncAll(
  config: CloudSyncConfig
): Promise<CloudSyncResult> {
  const errors: string[] = [];
  const toUpload: SyncFile[] = [];
  let downloaded = 0;

  // 1. Pull from server
  const pullResponse = await pullFromServer(config);
  const serverFiles = pullResponse.files;
  const serverByFilename = new Map(serverFiles.map((f) => [f.filename, f]));

  // 2. Load local collections + environments
  const localCollections = await collectionService.getAll();
  const localEnvironments = await environmentService.getAll();

  // 3. Reconcile collections
  for (const col of localCollections) {
    const filename = `${col.id}.json`;
    const serverFile = serverByFilename.get(filename);

    if (!serverFile) {
      // Local-only → upload
      try {
        const data = await exportCollectionToNative(col.id);
        const postman = exportToPostman(
          data.collection,
          data.folders,
          data.requests
        );
        toUpload.push({
          filename,
          entityType: "collection",
          content: postman,
          updatedAt: col.updated_at,
        });
      } catch (e) {
        errors.push(
          `Export ${col.name}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } else {
      const decision = reconcile(col.updated_at, serverFile.updatedAt);
      if (decision === "upload") {
        try {
          const data = await exportCollectionToNative(col.id);
          const postman = exportToPostman(
            data.collection,
            data.folders,
            data.requests
          );
          toUpload.push({
            filename,
            entityType: "collection",
            content: postman,
            updatedAt: col.updated_at,
          });
        } catch (e) {
          errors.push(
            `Export ${col.name}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      } else if (decision === "download") {
        try {
          await upsertCollectionFromServer(serverFile.content);
          downloaded++;
        } catch (e) {
          errors.push(
            `Import ${filename}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      serverByFilename.delete(filename);
    }
  }

  // 4. Reconcile environments
  for (const env of localEnvironments) {
    const filename = `env_${env.id}.json`;
    const serverFile = serverByFilename.get(filename);

    if (!serverFile) {
      toUpload.push({
        filename,
        entityType: "environment",
        content: environmentToJson(env),
        updatedAt: env.updated_at,
      });
    } else {
      const decision = reconcile(env.updated_at, serverFile.updatedAt);
      if (decision === "upload") {
        toUpload.push({
          filename,
          entityType: "environment",
          content: environmentToJson(env),
          updatedAt: env.updated_at,
        });
      } else if (decision === "download") {
        try {
          await upsertEnvironmentFromServer(serverFile.content);
          downloaded++;
        } catch (e) {
          errors.push(
            `Import ${filename}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      serverByFilename.delete(filename);
    }
  }

  // 5. Server-only files → import locally
  for (const [filename, serverFile] of serverByFilename) {
    try {
      if (serverFile.entityType === "collection") {
        await upsertCollectionFromServer(serverFile.content);
        downloaded++;
      } else if (serverFile.entityType === "environment") {
        await upsertEnvironmentFromServer(serverFile.content);
        downloaded++;
      }
    } catch (e) {
      errors.push(
        `Import ${filename}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // 6. Push local changes
  let uploaded = 0;
  if (toUpload.length > 0) {
    try {
      const pushResult = await pushToServer(config, {
        changes: toUpload,
        deletions: [],
      });
      uploaded = pushResult.synced;
    } catch (e) {
      errors.push(`Push: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 7. Save serverTime as lastSyncAt only if no critical errors
  if (errors.length === 0) {
    await saveCloudSyncConfig({
      ...config,
      lastSyncAt: pullResponse.serverTime,
    });
  }

  return { uploaded, downloaded, errors };
}

// --- Helpers ---

function environmentToJson(
  env: Environment
): Record<string, unknown> {
  return {
    id: env.id,
    name: env.name,
    variables: env.variables,
    is_active: env.is_active,
    updated_at: env.updated_at,
    created_at: env.created_at,
  };
}

async function upsertCollectionFromServer(content: unknown): Promise<void> {
  const jsonText = JSON.stringify(content);
  const { collection, folders, requests } = importPostmanCollection(
    JSON.parse(jsonText)
  );
  await db.transaction(
    "rw",
    [db.collections, db.folders, db.requests],
    async () => {
      const existing = await db.collections.get(collection.id);
      if (existing) {
        const folderIds = await db.folders
          .where("collection_id")
          .equals(collection.id)
          .primaryKeys();
        await db.folders.bulkDelete(folderIds);
        const requestIds = await db.requests
          .where("collection_id")
          .equals(collection.id)
          .primaryKeys();
        await db.requests.bulkDelete(requestIds);
      }
      await db.collections.put(collection);
      if (folders.length) await db.folders.bulkAdd(folders);
      if (requests.length) await db.requests.bulkAdd(requests);
    }
  );
}

async function upsertEnvironmentFromServer(content: unknown): Promise<void> {
  const data = content as Record<string, unknown>;
  if (!data.id || !data.name) return;

  const env: Environment = {
    id: String(data.id),
    name: String(data.name),
    variables: Array.isArray(data.variables) ? data.variables : [],
    is_active: Boolean(data.is_active),
    created_at: String(data.created_at || new Date().toISOString()),
    updated_at: String(data.updated_at || new Date().toISOString()),
  };

  await db.environments.put(env);
}
