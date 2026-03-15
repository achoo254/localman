/**
 * WebSocket server setup — creates ws.WebSocketServer in noServer mode,
 * handles HTTP upgrade with auth, heartbeat, and message routing.
 */

import type { IncomingMessage, Server } from "node:http";
import type { WsUser } from "./ws-auth.js";
import { WebSocketServer, type WebSocket } from "ws";
import { authenticateWsConnection } from "./ws-auth.js";
import { registerClient, cleanup } from "./channel-manager.js";
import { removeUserPresence, cleanupStalePresence } from "./presence-tracker.js";
import { routeMessage } from "./message-router.js";

const HEARTBEAT_INTERVAL = 30_000; // 30s ping interval
const HEARTBEAT_TIMEOUT = 10_000; // 10s pong timeout

/** Set up WebSocket server on an existing HTTP server (same port) */
export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 }); // 1MB max

  // Handle HTTP → WebSocket upgrade
  server.on("upgrade", async (req, socket, head) => {
    // Authenticate via token query param
    const user = await authenticateWsConnection(req);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, user);
    });
  });

  // Handle new connections
  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, user: WsUser) => {
    const client = registerClient(ws, user);

    // Message handling
    ws.on("message", (data) => {
      const raw = typeof data === "string" ? data : data.toString();
      routeMessage(ws, raw).catch((err) => {
        console.error("[WS] Message routing error:", err);
      });
    });

    // Connection closed
    ws.on("close", () => {
      removeUserPresence(client.user.id);
      cleanup(ws);
    });

    // Connection error
    ws.on("error", (err) => {
      console.error("[WS] Connection error:", err.message);
      removeUserPresence(client.user.id);
      cleanup(ws);
    });

    // Start heartbeat for this connection
    setupHeartbeat(ws);
  });

  // Periodic stale presence cleanup (every 60s)
  const presenceInterval = setInterval(cleanupStalePresence, 60_000);
  wss.on("close", () => clearInterval(presenceInterval));

  console.log("[WS] WebSocket server attached to HTTP server");
  return wss;
}

/** Ping/pong heartbeat to detect dead connections */
function setupHeartbeat(ws: WebSocket): void {
  let alive = true;

  const interval = setInterval(() => {
    if (!alive) {
      clearInterval(interval);
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  ws.on("pong", () => {
    alive = true;
  });

  ws.on("close", () => {
    clearInterval(interval);
  });
}
