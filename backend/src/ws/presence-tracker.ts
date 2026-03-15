/**
 * Presence tracker — tracks who's online and editing in each workspace.
 * Broadcasts presence changes to workspace channels.
 */

import { broadcast } from "./channel-manager.js";

export interface UserPresence {
  userId: string;
  userName: string;
  status: "active" | "editing" | "idle";
  entityId?: string;
  lastSeen: number; // timestamp ms
}

// workspace channel → userId → presence
const presenceMap = new Map<string, Map<string, UserPresence>>();

/** Update user presence in a workspace channel */
export function updatePresence(
  channel: string,
  userId: string,
  userName: string,
  status: "active" | "editing" | "idle",
  entityId?: string,
): void {
  if (!presenceMap.has(channel)) {
    presenceMap.set(channel, new Map());
  }

  const channelPresence = presenceMap.get(channel)!;
  channelPresence.set(userId, {
    userId,
    userName,
    status,
    entityId,
    lastSeen: Date.now(),
  });

  // Broadcast presence update to all in channel
  broadcast(channel, {
    type: "presence",
    user_id: userId,
    user_name: userName,
    status,
    entity_id: entityId,
    workspace_id: channel.replace("workspace:", ""),
  });
}

/** Remove user from all presence tracking (on disconnect) */
export function removeUserPresence(userId: string): void {
  for (const [channel, channelPresence] of presenceMap) {
    if (channelPresence.has(userId)) {
      channelPresence.delete(userId);

      // Broadcast leave
      broadcast(channel, {
        type: "presence",
        user_id: userId,
        status: "offline",
        workspace_id: channel.replace("workspace:", ""),
      });

      if (channelPresence.size === 0) {
        presenceMap.delete(channel);
      }
    }
  }
}

/** Get all presence entries for a channel */
export function getChannelPresence(channel: string): UserPresence[] {
  const channelPresence = presenceMap.get(channel);
  return channelPresence ? [...channelPresence.values()] : [];
}

/** Clean up stale presence entries (>60s no heartbeat) */
export function cleanupStalePresence(): void {
  const staleThreshold = Date.now() - 60_000;

  for (const [channel, channelPresence] of presenceMap) {
    for (const [userId, presence] of channelPresence) {
      if (presence.lastSeen < staleThreshold) {
        channelPresence.delete(userId);
        broadcast(channel, {
          type: "presence",
          user_id: userId,
          status: "offline",
          workspace_id: channel.replace("workspace:", ""),
        });
      }
    }
    if (channelPresence.size === 0) {
      presenceMap.delete(channel);
    }
  }
}
