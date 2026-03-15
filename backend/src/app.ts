import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import { env } from "./env.js";
import { firebaseAuthMiddleware } from "./middleware/auth-guard.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { syncRouter } from "./routes/sync.js";
import { workspaceRouter } from "./routes/workspace-routes.js";
import { collectionRouter } from "./routes/collection-routes.js";
import { environmentRouter } from "./routes/environment-routes.js";
import { entitySyncRouter } from "./routes/entity-sync-routes.js";
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
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Body size limit for sync push (10MB)
app.use("/api/sync/push", bodyLimit({ maxSize: 10 * 1024 * 1024 }));

// Firebase auth for all /api/* routes
app.use("/api/*", firebaseAuthMiddleware);

// Routes
app.route("/api", healthRouter);
app.route("/api", syncRouter);
app.route("/api", workspaceRouter);
app.route("/api", collectionRouter);
app.route("/api", environmentRouter);
app.route("/api", entitySyncRouter);

// Error handler
app.onError(errorHandler);

export { app };
