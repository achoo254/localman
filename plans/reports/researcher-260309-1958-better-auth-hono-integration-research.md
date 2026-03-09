# Better Auth + Hono Integration Research Report

**Date:** 2026-03-09
**Scope:** TypeScript backend auth framework evaluation for Localman Phase 2 (Cloud Sync)

---

## Executive Summary

**Better Auth** is a headless, framework-agnostic authentication framework (TypeScript) offering email/password, OAuth (35+ providers), passkeys, MFA, and organizations out-of-the-box. **Hono** is a lightweight web framework (built on Web Standards, zero dependencies) that runs on Node.js 18+ via `@hono/node-server` adapter. Direct integration exists: Better Auth exposes a handler for Hono routes. Both are production-ready and well-suited for Localman's Phase 2 backend.

---

## 1. Better Auth Core Architecture

### How It Works

Better Auth is **configuration-driven authentication as a service**:

1. Declare auth config (database, methods, plugins)
2. Framework auto-manages sessions, tokens, user lifecycle
3. Exposes HTTP handler (`auth.handler()`) for mounting in web frameworks
4. Client SDK provided for React/TypeScript

**Key Principle:** Keep data in your infrastructure (self-hosted PostgreSQL, not third-party SaaS).

### Session Management: JWT vs Session-Based

Better Auth supports **both**:

| Approach | When to Use | Trade-off |
|----------|-----------|-----------|
| **Session-based (default)** | Web apps with cookies + CORS | Stateful; requires session DB queries |
| **JWT (via plugin)** | REST APIs, mobile clients | Stateless; larger payloads |

**For Localman REST API:** Session-based with cookie transport (default) works if client is browser/Electron. For mobile/third-party integrations, enable JWT plugin.

### Database Adapter: Drizzle + PostgreSQL

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db"; // Your Drizzle pool

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL || "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    autoSignUpEmailVerified: false, // Require email verification
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    // Add JWT plugin if REST clients need bearer tokens
    // Import from "better-auth/plugins/jwt-plugin"
  ],
});
```

**Schema Generation:**
```bash
npx auth@latest generate  # Auto-creates Drizzle schema
npx drizzle-kit migrate   # Apply migrations
```

Generated tables: `user`, `session`, `account` (OAuth), `verification`.

---

## 2. Hono Web Framework

### Latest Version & Runtime

- **Latest:** v4.12.5 (continuously updated)
- **Node.js adapter:** `@hono/node-server` v1.19.11
- **Requirements:** Node.js 18+
- **Philosophy:** Web Standards API, zero dependencies

### Middleware Ecosystem

**Built-in middleware (no external deps):**
- CORS, Basic Auth, Bearer Auth, JWT validation
- Body limit, Cache, Compress, CSRF protection, Logger
- IP restriction, ETag, and more

**Execution model (onion/nesting):**
```typescript
app.use(async (c, next) => {
  // Pre-handler (middleware runs here first)
  console.log("Request:", c.req.url);
  await next(); // Call next middleware/handler
  // Post-handler (cleanup after handler completes)
  console.log("Response status:", c.res.status);
});
```

**Custom middleware factory** (type-safe context):
```typescript
import { createMiddleware } from "hono/factory";

const authMiddleware = createMiddleware<{
  Variables: { userId: string };
}>(async (c, next) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.text("Unauthorized", 401);

  c.set("userId", "user123"); // Type-safe set
  await next();
});

app.use(authMiddleware);
app.get("/protected", (c) => {
  const userId = c.get("userId"); // Typed retrieval
  return c.json({ userId });
});
```

### Recommended REST API Structure

**Modular routing with `app.route()`:**

```
src/
  index.ts              # App bootstrap
  routes/
    collections.ts      # Collection CRUD routes
    requests.ts         # Request CRUD routes
    sync.ts             # Sync endpoints
  middleware/
    auth.ts             # Better Auth session extraction
    error-handler.ts
  types.ts              # Shared types
```

**Example:** `src/routes/collections.ts`
```typescript
import { Hono } from "hono";

const collections = new Hono().basePath("/collections");

collections.get("/", (c) => {
  const userId = c.get("userId"); // From middleware
  return c.json({ collections: [] }); // Fetch user's collections
});

collections.post("/", (c) => {
  // Create collection
  return c.json({ id: "123" }, 201);
});

export default collections;
```

**Main app:** `src/index.ts`
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import collectionsRouter from "./routes/collections";
import requestsRouter from "./routes/requests";
import syncRouter from "./routes/sync";
import { sessionMiddleware } from "./middleware/auth";

const app = new Hono();

// Global middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(sessionMiddleware);

// Mount routers
app.route("/api", collectionsRouter);
app.route("/api", requestsRouter);
app.route("/api", syncRouter);

serve(app); // Node.js HTTP server
```

### Deployment on Bare Metal Node.js

Hono runs natively on Node.js via `@hono/node-server`:

```bash
pnpm add hono @hono/node-server
```

No edge/serverless runtime required. Standard Node.js process:
```typescript
import { serve } from "@hono/node-server";

serve({
  fetch: app.fetch,
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0",
});
```

Scales via PM2, systemd, or Docker in a traditional VM environment.

---

## 3. Better Auth + Hono Integration Pattern

### Setup: Mount Better Auth Handler

```typescript
import { auth } from "./auth"; // Better Auth instance

// Intercept all auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw); // Pass raw Web Request
});
```

**CORS requirement:** Register CORS middleware **before** auth routes:
```typescript
app.use(
  "/api/auth/*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Required for cookie transport
  }),
);

// Then mount auth
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

### Session/User Extraction Middleware

```typescript
import { createMiddleware } from "hono/factory";

export const sessionMiddleware = createMiddleware<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>(async (c, next) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!sessionData) {
      c.set("user", null);
      c.set("session", null);
    } else {
      c.set("user", sessionData.user);
      c.set("session", sessionData.session);
    }
  } catch {
    c.set("user", null);
    c.set("session", null);
  }

  await next();
});
```

**Usage in protected routes:**
```typescript
app.get("/api/sync/pull", (c) => {
  const user = c.get("user");
  if (!user) return c.text("Unauthorized", 401);

  return c.json({
    syncData: {
      collections: [],
      requests: [],
      updated_at: new Date().toISOString(),
    },
  });
});
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│ Hono App (@hono/node-server, Node.js 18+)          │
├─────────────────────────────────────────────────────┤
│ Global Middleware Layer                              │
│  ├─ CORS                                             │
│  ├─ Session Extraction (Better Auth)                │
│  └─ Logger                                           │
├─────────────────────────────────────────────────────┤
│ Routes                                               │
│  ├─ /api/auth/* ────────→ Better Auth Handler       │
│  │                        ↓                          │
│  │                   PostgreSQL DB                   │
│  │                   (user, session, account)        │
│  │                                                   │
│  ├─ /api/collections   ────→ Drizzle ORM queries    │
│  ├─ /api/requests          (collections, requests)  │
│  └─ /api/sync              (history, pending_sync)  │
├─────────────────────────────────────────────────────┤
│ Context Variables (Type-Safe)                        │
│  ├─ user (from session)                             │
│  └─ session metadata                                 │
└─────────────────────────────────────────────────────┘
```

### REST Sync Endpoints (Localman-Specific)

**Pull (GET):** Fetch user's data from server
```typescript
export const syncRouter = new Hono().basePath("/sync");

syncRouter.get("/pull", (c) => {
  const user = c.get("user");
  if (!user) return c.text("Unauthorized", 401);

  // Query IndexedDB-equivalent tables for this user
  // Return collections, requests, environments with updated_at timestamps
  return c.json({
    collections: [],
    requests: [],
    environments: [],
    history: [],
    lastSync: null,
  });
});
```

**Push (POST):** Send offline changes to server
```typescript
syncRouter.post("/push", (c) => {
  const user = c.get("user");
  if (!user) return c.text("Unauthorized", 401);

  const { collections, requests, deletions } = c.req.json();

  // Conflict resolution: Last-Write-Wins (LWW) by updated_at
  // Merge with existing data in DB
  // Return merged state
  return c.json({
    success: true,
    synced: { collections: 5, requests: 12 },
    conflicts: [],
  });
});
```

---

## 4. Route Protection Patterns

### Declarative Route Guard

```typescript
const protected = createMiddleware<{
  Variables: { userId: string };
}>((c, next) => {
  const user = c.get("user");
  if (!user) return c.text("Unauthorized", 401);
  c.set("userId", user.id);
  return next();
});

// Usage
app.post("/api/collections", protected, (c) => {
  const userId = c.get("userId");
  // Handle collection creation
});
```

### Scoped Queries (Multi-Tenancy)

Ensure all queries filter by `user_id`:
```typescript
// DO: Use Drizzle with user_id filter
const userCollections = await db.select()
  .from(collections)
  .where(eq(collections.user_id, userId));

// DON'T: Forget to filter by user
const allCollections = await db.select().from(collections);
```

---

## 5. Client-Side SDK Integration

Better Auth provides `@better-auth/react` for React/TypeScript:

```typescript
import { createAuthClient } from "better-auth/react";

const { signUp, signIn, signOut, useSession } = createAuthClient({
  baseURL: "http://localhost:3000",
  basePath: "/api/auth",
});

// In React component
function Profile() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <button onClick={() => signIn()}>Sign In</button>;

  return <div>Welcome, {session.user.name}</div>;
}
```

**Tauri Integration:** In Localman's React + Tauri frontend, this works without modification if your Tauri HTTP plugin bypasses CORS and sends cookies correctly (it does via `@tauri-apps/plugin-http`).

---

## 6. Key Implementation Notes

### PostgreSQL Schema
Better Auth auto-generates via CLI. Expected tables:
- `user` (id, email, name, emailVerified)
- `session` (id, userId, expiresAt, token)
- `account` (userId, provider, providerAccountId)
- `verification` (id, identifier, value, expiresAt)

### Email Configuration
For email verification & password reset, configure an email provider:
```typescript
import { sendEmail } from "better-auth/plugins/email";

export const auth = betterAuth({
  emailAndPassword: { enabled: true },
  plugins: [
    sendEmail({
      sendEmail: async (email, url, type) => {
        // Use Resend, SendGrid, or custom SMTP
        await sendEmailViaProvider(email, { url, type });
      },
    }),
  ],
});
```

### Environment Variables
```env
AUTH_SECRET=<random-32-char-string>
AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/localman
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
```

### Type Safety
Both frameworks are TypeScript-first. Better Auth exports inferred types:
```typescript
type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
```

Use these for context and route handlers.

---

## 7. Production Readiness Checklist

- [ ] Secret key generation (`AUTH_SECRET`)
- [ ] CORS origin whitelist (not `*` in production)
- [ ] Email provider setup (Resend, SendGrid, etc.)
- [ ] PostgreSQL connection pooling (use PgBouncer or Drizzle's pool option)
- [ ] Rate limiting on auth endpoints (`/api/auth/sign-in`, `/api/auth/sign-up`)
- [ ] HTTPS enforced (set `secure: true` in session cookies for production)
- [ ] Error handling middleware (don't leak auth details in errors)
- [ ] Request logging for audit trail
- [ ] Backup & recovery plan for PostgreSQL

---

## Unresolved Questions

1. **Email provider:** Which service should Localman use? (Resend, SendGrid, AWS SES?)
2. **Rate limiting:** Should Hono use built-in or external (Redis-backed) rate limiter for auth endpoints?
3. **Session cookie domain:** For Tauri app + backend, should cookies use SameSite=Lax or be stored in secure storage?
4. **Google OAuth redirect:** Should callback go to `http://localhost:3000/api/auth/callback/google` or app-specific URI?
5. **Pending sync schema:** How should `pending_sync` queue integrate with Better Auth's existing tables? (Separate table, or part of `collection`/`request` schema?)

---

## Sources

- [Better Auth Documentation](https://better-auth.com)
- [Better Auth - Hono Integration](https://better-auth.com/docs/integrations/hono)
- [Drizzle ORM Adapter - Better Auth](https://better-auth.com/docs/adapters/drizzle)
- [Hono Web Framework Documentation](https://hono.dev/docs/)
- [Hono Middleware Guide](https://hono.dev/docs/guides/middleware)
- [@hono/node-server npm](https://www.npmjs.com/package/@hono/node-server)
- [BetterAuth with Encore.ts - Complete Backend Guide](https://encore.dev/blog/betterauth-tutorial)
- [Build Production-Ready Web Apps with Hono - FreeCodeCamp](https://www.freecodecamp.org/news/build-production-ready-web-apps-with-hono/)
- [LogRocket: Is Better Auth the Key to Solving Authentication Headaches?](https://blog.logrocket.com/better-auth-authentication/)
