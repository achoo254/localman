import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./env.js";
import { setupWebSocket } from "./ws/websocket-server.js";

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Localman API running on http://localhost:${info.port}`);
});

// Attach WebSocket server to the same HTTP server (same port)
setupWebSocket(server as Server);
