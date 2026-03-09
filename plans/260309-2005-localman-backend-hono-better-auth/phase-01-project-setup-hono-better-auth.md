# Phase 01 — Project Setup: Hono + Better Auth + Drizzle

## Context Links

- [Plan overview](./plan.md)
- [Research: Better Auth + Hono](../reports/researcher-260309-1958-better-auth-hono-integration-research.md)
- [Brainstorm](../reports/brainstorm-260309-1951-localman-backend-hono-better-auth.md)

## Overview

- **Priority:** P1
- **Status:** complete
- **Effort:** 2h
- **Description:** Bootstrap `backend/` directory with Hono, Better Auth, Drizzle ORM, and TypeScript. Configure pnpm workspace. Create app skeleton with health endpoint.

## Key Insights

- Hono v4 + `@hono/node-server` runs on standard Node.js — no edge runtime needed
- Better Auth mounts via `auth.handler(c.req.raw)` on `/*` wildcard path
- Better Auth JWT plugin provides stateless Bearer tokens ideal for desktop clients
- Drizzle adapter for Better Auth auto-generates auth tables

## Requirements

### Functional
- `backend/` directory initialized as pnpm package
- Hono app serves on port 3001 (configurable via env)
- `GET /api/health` returns `{ status: "ok", timestamp }`
- Better Auth mounted at `/api/auth/*`
- CORS configured for desktop app origins
- Zod validates all env vars at startup

### Non-Functional
- TypeScript strict mode
- Node.js 20+ target
- ESM modules
- Hot reload via tsx watch

## Architecture

```
backend/
├── src/
│   ├── index.ts         # Entry: import app, serve via @hono/node-server
│   ├── app.ts           # Hono instance, CORS, logger, mount auth + routes
│   ├── auth.ts          # Better Auth config (email/password, Google OAuth, JWT plugin)
│   ├── env.ts           # Zod schema for env vars, parsed + exported
│   ├── db/
│   │   └── client.ts    # Drizzle client with postgres driver
│   ├── routes/
│   │   └── health.ts    # Health check route
│   ├── middleware/
│   │   ├── auth-guard.ts    # Extracts user from session/JWT, sets context
│   │   └── error-handler.ts # Global error handler
│   └── types/
│       └── context.ts   # Hono Variables type (user, session)
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Related Code Files

### Create
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/drizzle.config.ts`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/src/index.ts`
- `backend/src/app.ts`
- `backend/src/auth.ts`
- `backend/src/env.ts`
- `backend/src/db/client.ts`
- `backend/src/routes/health.ts`
- `backend/src/middleware/auth-guard.ts`
- `backend/src/middleware/error-handler.ts`
- `backend/src/types/context.ts`

### Modify
- `pnpm-workspace.yaml` — add `backend` to packages

## Implementation Steps

### 1. Update pnpm workspace

Add `backend` to `pnpm-workspace.yaml`:
```yaml
packages:
  - "backend"
```

### 2. Initialize backend package

```bash
cd backend
pnpm init
```

Set `"type": "module"` in `package.json`.

### 3. Install dependencies

```bash
# Core
pnpm add hono @hono/node-server better-auth drizzle-orm postgres zod

# Dev
pnpm add -D typescript tsx @types/node drizzle-kit
```

### 4. Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```

### 5. Create env.ts — Zod validation

```typescript
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().default("http://localhost:3001"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().default("*"), // comma-separated in production
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

### 6. Create db/client.ts — Drizzle

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client);
```

### 7. Create types/context.ts

```typescript
import type { auth } from "../auth";

export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session.session;

export type AppVariables = {
  user: AuthUser | null;
  session: AuthSession | null;
};
```

### 8. Create auth.ts — Better Auth config

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { db } from "./db/client";
import { env } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.AUTH_SECRET,
  baseURL: env.AUTH_URL,
  basePath: "/api/auth",

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Skip for Phase A
  },

  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  plugins: [jwt()],
});
```

### 9. Create middleware/auth-guard.ts

```typescript
import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../types/context";
import { auth } from "../auth";

// Extracts session — does NOT block unauthenticated requests
export const sessionMiddleware = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

// Blocks unauthenticated requests with 401
export const requireAuth = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await next();
});
```

### 10. Create middleware/error-handler.ts

```typescript
import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("[Error]", err.message);
  const status = "status" in err ? (err as { status: number }).status : 500;
  return c.json(
    { error: err.message || "Internal Server Error" },
    status as any
  );
};
```

### 11. Create routes/health.ts

```typescript
import { Hono } from "hono";

export const healthRouter = new Hono();

healthRouter.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);
```

### 12. Create app.ts — Main Hono app

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { env } from "./env";
import { sessionMiddleware } from "./middleware/auth-guard";
import { errorHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health";
import type { AppVariables } from "./types/context";

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware
app.use(logger());
app.use(
  cors({
    origin: env.CORS_ORIGINS === "*" ? "*" : env.CORS_ORIGINS.split(","),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Better Auth handler — MUST be before sessionMiddleware
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Session extraction for all /api/* routes (except auth)
app.use("/api/*", sessionMiddleware);

// Routes
app.route("/api", healthRouter);

// Error handler
app.onError(errorHandler);

export { app };
```

### 13. Create index.ts — Entry point

```typescript
import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./env";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Localman API running on http://localhost:${info.port}`);
});
```

### 14. Create .env.example

```env
PORT=3001
DATABASE_URL=postgresql://localman:localman@localhost:5432/localman
AUTH_SECRET=change-this-to-a-random-32-char-string!!
AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CORS_ORIGINS=*
NODE_ENV=development
```

### 15. Create .gitignore

```
node_modules/
dist/
.env
```

### 16. Add scripts to package.json

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "auth:generate": "npx @better-auth/cli generate"
  }
}
```

### 17. Create drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 18. Verify setup

```bash
cd backend
cp .env.example .env  # Edit with real DB URL
pnpm dev              # Should start on :3001
curl http://localhost:3001/api/health  # Should return { status: "ok" }
```

## Todo List

- [x] Create `backend/` directory
- [x] Update `pnpm-workspace.yaml`
- [x] Initialize package.json with deps
- [x] Create tsconfig.json
- [x] Create env.ts with Zod validation
- [x] Create db/client.ts (Drizzle)
- [x] Create auth.ts (Better Auth config)
- [x] Create types/context.ts
- [x] Create middleware/auth-guard.ts
- [x] Create middleware/error-handler.ts
- [x] Create routes/health.ts
- [x] Create app.ts (main Hono app)
- [x] Create index.ts (entry point)
- [x] Create .env.example and .gitignore
- [x] Create drizzle.config.ts
- [x] Verify `pnpm dev` starts without errors
- [x] Verify `GET /api/health` returns OK

## Success Criteria

- `pnpm dev` in `backend/` starts Hono server on port 3001
- `GET /api/health` returns `{ status: "ok", timestamp: "..." }`
- TypeScript compiles with `pnpm build`
- Better Auth routes respond at `/api/auth/*` (may error without DB — expected)
- No lint errors

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Better Auth JWT plugin API changes | Medium | Pin version, test on install |
| Drizzle + Better Auth adapter compatibility | Low | Both widely used together |
| pnpm workspace conflicts with root | Low | Separate dependency trees |

## Security Considerations

- `AUTH_SECRET` must be cryptographically random (32+ chars)
- `.env` excluded from git
- CORS origins must be restricted in production (not `*`)
- Error handler must not leak stack traces in production

## Next Steps

Phase 02 — Create database schema (Better Auth tables + `user_files`)
