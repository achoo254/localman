/**
 * Zustand store for workspace presence — tracks who's online and editing.
 * Fed by WebSocket presence events from ws-event-handler.
 */

import { create } from "zustand";
import { wsManager } from "../services/sync/websocket-manager";

export interface UserPresence {
  userId: string;
  userName: string;
  status: "active" | "editing" | "idle" | "offline";
  entityId?: string;
  lastSeen: number;
}

interface PresenceStore {
  /** workspaceId → userId → presence */
  presence: Map<string, Map<string, UserPresence>>;

  /** Update or add a user's presence in a workspace */
  updatePresence: (workspaceId: string, data: UserPresence) => void;

  /** Remove a user from a workspace (offline) */
  removeUser: (workspaceId: string, userId: string) => void;

  /** Get all present users in a workspace */
  getWorkspacePresence: (workspaceId: string) => UserPresence[];

  /** Send own presence update via WebSocket */
  sendPresence: (
    workspaceId: string,
    status: "active" | "editing" | "idle",
    entityId?: string,
  ) => void;

  /** Initialize presence event listener — returns cleanup fn */
  initPresenceListener: () => () => void;
}

export const usePresenceStore = create<PresenceStore>((set, get) => ({
  presence: new Map(),

  updatePresence(workspaceId, data) {
    set((state) => {
      const next = new Map(state.presence);
      if (!next.has(workspaceId)) {
        next.set(workspaceId, new Map());
      }
      const wsPresence = new Map(next.get(workspaceId)!);

      if (data.status === "offline") {
        wsPresence.delete(data.userId);
      } else {
        wsPresence.set(data.userId, data);
      }

      next.set(workspaceId, wsPresence);
      return { presence: next };
    });
  },

  removeUser(workspaceId, userId) {
    set((state) => {
      const next = new Map(state.presence);
      const wsPresence = next.get(workspaceId);
      if (wsPresence) {
        const updated = new Map(wsPresence);
        updated.delete(userId);
        next.set(workspaceId, updated);
      }
      return { presence: next };
    });
  },

  getWorkspacePresence(workspaceId) {
    const wsPresence = get().presence.get(workspaceId);
    return wsPresence ? [...wsPresence.values()] : [];
  },

  sendPresence(workspaceId, status, entityId) {
    wsManager.send({
      type: "presence",
      workspace_id: workspaceId,
      status,
      entity_id: entityId,
    });
  },

  initPresenceListener() {
    const { updatePresence } = get();

    const cleanup = wsManager.on("presence", (msg) => {
      const workspaceId = msg.workspace_id as string;
      if (!workspaceId) return;

      updatePresence(workspaceId, {
        userId: msg.user_id as string,
        userName: (msg.user_name as string) ?? "",
        status: (msg.status as UserPresence["status"]) ?? "active",
        entityId: msg.entity_id as string | undefined,
        lastSeen: Date.now(),
      });
    });

    return cleanup;
  },
}));
