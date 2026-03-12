/**
 * WebSocket message router — parse incoming JSON messages and route
 * to appropriate handlers (subscribe, entity mutations, presence).
 */

import type WebSocket from "ws";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { workspaceMembers } from "../db/workspace-schema.js";
import type { WsClient } from "./channel-manager.js";
import {
  subscribe,
  unsubscribe,
  broadcast,
  getClient,
} from "./channel-manager.js";
import { updatePresence } from "./presence-tracker.js";

// Rate limiting: max 60 messages per 10 seconds per connection
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 60;
const rateLimits = new WeakMap<WebSocket, { count: number; resetAt: number }>();

function isRateLimited(ws: WebSocket): boolean {
  const now = Date.now();
  let entry = rateLimits.get(ws);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimits.set(ws, entry);
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

/** Route an incoming raw message string to the appropriate handler */
export async function routeMessage(
  ws: WebSocket,
  raw: string,
): Promise<void> {
  const client = getClient(ws);
  if (!client) return;

  // Rate limit check
  if (isRateLimited(ws)) {
    sendError(ws, "RATE_LIMITED", "Too many messages, slow down");
    return;
  }

  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw);
  } catch {
    sendError(ws, "PARSE_ERROR", "Invalid JSON");
    return;
  }

  const type = msg.type as string;
  if (!type) {
    sendError(ws, "MISSING_TYPE", "Message must have a type field");
    return;
  }

  try {
    switch (type) {
      case "subscribe":
        await handleSubscribe(client, msg);
        break;
      case "unsubscribe":
        handleUnsubscribe(client, msg);
        break;
      case "entity:update":
      case "entity:create":
      case "entity:delete":
        await handleEntityMutation(client, msg);
        break;
      case "presence":
        handlePresence(client, msg);
        break;
      case "pong":
        // Heartbeat response — no action needed, ws lib handles it
        break;
      default:
        sendError(ws, "UNKNOWN_TYPE", `Unknown message type: ${type}`);
    }
  } catch (err) {
    sendError(
      ws,
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Internal error",
    );
  }
}

/** Handle channel subscription request */
async function handleSubscribe(
  client: WsClient,
  msg: Record<string, unknown>,
): Promise<void> {
  const channel = msg.channel as string;
  if (!channel) {
    sendError(client.ws, "MISSING_CHANNEL", "channel is required");
    return;
  }

  const ok = await subscribe(client, channel);
  if (ok) {
    send(client.ws, { type: "subscribed", channel });
  } else {
    sendError(client.ws, "SUBSCRIBE_DENIED", `Cannot subscribe to ${channel}`);
  }
}

/** Handle channel unsubscription */
function handleUnsubscribe(
  client: WsClient,
  msg: Record<string, unknown>,
): void {
  const channel = msg.channel as string;
  if (channel) unsubscribe(client, channel);
}

/**
 * Handle entity mutation — broadcast to relevant workspace channel.
 * The actual DB mutation is done via HTTP API (entity-sync-routes).
 * WS only broadcasts the change notification to other clients.
 * Requires editor+ role — viewers cannot broadcast mutations.
 */
async function handleEntityMutation(
  client: WsClient,
  msg: Record<string, unknown>,
): Promise<void> {
  const type = msg.type as string;
  const workspaceId = msg.workspace_id as string;

  if (!workspaceId) {
    sendError(client.ws, "MISSING_WORKSPACE", "workspace_id is required for entity mutations");
    return;
  }

  const channel = `workspace:${workspaceId}`;

  // Only broadcast if client is subscribed to this channel
  if (!client.channels.has(channel)) {
    sendError(client.ws, "NOT_SUBSCRIBED", `Not subscribed to ${channel}`);
    return;
  }

  // RBAC: only editor+ can broadcast entity mutations
  const member = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, client.user.id),
      ),
    )
    .limit(1);

  if (!member[0] || member[0].role === "viewer") {
    sendError(client.ws, "FORBIDDEN", "Viewers cannot broadcast entity mutations");
    return;
  }

  // Map client action to past-tense server event (matches client listeners)
  const typeMap: Record<string, string> = {
    "entity:update": "entity:updated",
    "entity:create": "entity:created",
    "entity:delete": "entity:deleted",
  };

  const serverMsg: Record<string, unknown> = {
    type: typeMap[type] ?? type,
    entity_type: msg.entity_type,
    entity_id: msg.entity_id ?? msg.id,
    user_id: client.user.id,
    user_name: client.user.name,
  };

  if (type === "entity:update") {
    serverMsg.changes = msg.changes;
    serverMsg.base_version = msg.base_version;
  } else if (type === "entity:create") {
    serverMsg.data = msg.data;
    serverMsg.parent_id = msg.parent_id;
    serverMsg.collection_id = msg.collection_id;
  }

  // Broadcast to all workspace members except sender
  broadcast(channel, serverMsg, client.ws);
}

/** Handle presence update */
function handlePresence(
  client: WsClient,
  msg: Record<string, unknown>,
): void {
  const workspaceId = msg.workspace_id as string;
  if (!workspaceId) return;

  const channel = `workspace:${workspaceId}`;
  if (!client.channels.has(channel)) return;

  updatePresence(
    channel,
    client.user.id,
    client.user.name,
    (msg.status as "active" | "editing" | "idle") ?? "active",
    msg.entity_id as string | undefined,
  );
}

/** Send a JSON message to a client */
function send(ws: WebSocket, data: object): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

/** Send an error message to a client */
function sendError(ws: WebSocket, code: string, message: string): void {
  send(ws, { type: "error", code, message });
}
