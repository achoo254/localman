/**
 * WebSocket channel manager — manages per-workspace and per-user channels.
 * Handles subscribe/unsubscribe/broadcast with RBAC checks.
 */

import type WebSocket from "ws";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { workspaceMembers } from "../db/workspace-schema.js";
import type { WsUser } from "./ws-auth.js";

/** Metadata attached to each WebSocket connection */
export interface WsClient {
  ws: WebSocket;
  user: WsUser;
  channels: Set<string>;
}

// Channel name → set of connected clients
const channels = new Map<string, Set<WsClient>>();

// WebSocket instance → client metadata (for cleanup on disconnect)
const clientMap = new Map<WebSocket, WsClient>();

/** Register a new client after successful auth */
export function registerClient(ws: WebSocket, user: WsUser): WsClient {
  const client: WsClient = { ws, user, channels: new Set() };
  clientMap.set(ws, client);
  return client;
}

/** Get client by WebSocket instance */
export function getClient(ws: WebSocket): WsClient | undefined {
  return clientMap.get(ws);
}

/** Validate channel name format — only workspace:{uuid} and user:{id} allowed */
const CHANNEL_PATTERN = /^(workspace|user):[a-zA-Z0-9_-]+$/;

/**
 * Subscribe client to a channel after RBAC check.
 * Workspace channels require membership; personal channels require ownership.
 */
export async function subscribe(
  client: WsClient,
  channel: string,
): Promise<boolean> {
  // Validate channel name format
  if (!CHANNEL_PATTERN.test(channel)) return false;

  // RBAC check for workspace channels
  if (channel.startsWith("workspace:")) {
    const workspaceId = channel.slice("workspace:".length);
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

    if (!member[0]) return false;
  }

  // Personal channel — only the owner can subscribe
  if (channel.startsWith("user:")) {
    const userId = channel.slice("user:".length);
    if (userId !== client.user.id) return false;
  }

  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)!.add(client);
  client.channels.add(channel);
  return true;
}

/** Unsubscribe client from a channel */
export function unsubscribe(client: WsClient, channel: string): void {
  const set = channels.get(channel);
  if (set) {
    set.delete(client);
    if (set.size === 0) channels.delete(channel); // lazy cleanup
  }
  client.channels.delete(channel);
}

/** Broadcast a message to all clients in a channel, optionally excluding sender */
export function broadcast(
  channel: string,
  message: object,
  excludeWs?: WebSocket,
): void {
  const set = channels.get(channel);
  if (!set) return;

  const data = JSON.stringify(message);
  for (const client of set) {
    if (client.ws !== excludeWs && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

/** Remove client from all channels on disconnect */
export function cleanup(ws: WebSocket): void {
  const client = clientMap.get(ws);
  if (!client) return;

  for (const channel of client.channels) {
    const set = channels.get(channel);
    if (set) {
      set.delete(client);
      if (set.size === 0) channels.delete(channel);
    }
  }
  clientMap.delete(ws);
}

/** Get all clients in a channel (for presence queries) */
export function getChannelClients(channel: string): WsClient[] {
  const set = channels.get(channel);
  return set ? [...set] : [];
}
