import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import { auth } from "./auth.js";
import { env } from "./env.js";
import { sessionMiddleware } from "./middleware/auth-guard.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { syncRouter } from "./routes/sync.js";
import type { AppVariables } from "./types/context.js";

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware
app.use(logger());
app.use(
  cors({
    origin:
      env.CORS_ORIGINS === "*"
        ? ["http://localhost:1420", "tauri://localhost", "https://tauri.localhost"]
        : env.CORS_ORIGINS.split(","),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Better Auth handler — MUST be before sessionMiddleware
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Body size limit for sync push (10MB)
app.use("/api/sync/push", bodyLimit({ maxSize: 10 * 1024 * 1024 }));

// Session extraction for all /api/* routes (except auth handled above)
app.use("/api/*", sessionMiddleware);

// Routes
app.route("/api", healthRouter);
app.route("/api", syncRouter);

// Error handler
app.onError(errorHandler);

export { app };
