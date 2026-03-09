# Brainstorm: Localman Backend Server — Hono + Better Auth

**Date:** 2026-03-09
**Context:** Replacing original Fastify-based plan with Hono + Better Auth stack

---

## Problem Statement

Localman desktop app (Phase 1 complete) needs a backend server for:
1. User authentication (email/password + Google OAuth)
2. Cloud sync of collections + environments between devices
3. Single-user focus now, extensible for team collaboration later

Original plan used Fastify + manual JWT auth. Brainstorm concluded a simpler, more maintainable stack.

---

## Decisions Made

| Area | Decision | Rationale |
|---|---|---|
| Web Framework | **Hono** | Lighter than Fastify, official Better Auth integration, Web Standards API |
| Auth | **Better Auth** + JWT plugin | No manual JWT/session code. Email/password + Google OAuth out-of-box |
| Database | **PostgreSQL** | ACID, jsonb support, team features later. Better Auth has Drizzle adapter |
| ORM | **Drizzle ORM** | Type-safe SQL, auto-migrations, works with Better Auth schema gen |
| Data Model | **JSON blobs** in `user_files` table | Server = dumb store. Client handles conflict resolution (LWW) |
| Sync API | **Pull/Push pattern** | `POST /sync/push` + `GET /sync/pull`. Batch support, flexible |
| Auth Transport | **Bearer JWT** (not cookies) | Desktop app; no cookie dependency. Better Auth JWT plugin |
| Email | **Skip for Phase A** | No email verification. User auto-active on register |
| Deploy | **PM2 + systemd** on bare metal | No Docker. PostgreSQL installed directly on server |
| Repo | **Monorepo** `backend/` directory | Share types with frontend, pnpm workspace |

---

## Evaluated Approaches

### 1. Fastify + Manual JWT (Original Plan) — REJECTED
**Pros:** Mature, fast, good ecosystem
**Cons:** ~4h manual auth implementation, session/token management boilerplate, cookie handling complexity with Tauri
**Verdict:** Over-engineering for a dumb file store backend

### 2. Hono + Better Auth (Selected) — RECOMMENDED
**Pros:** Auth handled by framework (~0h auth code), JWT plugin for desktop, lightweight (~14KB), official integration
**Cons:** Newer ecosystem, less Fastify-specific middleware
**Verdict:** Best effort-to-value ratio. Auth is hardest part; delegating to Better Auth saves 60%+ effort

### 3. Express + Passport.js — NOT CONSIDERED
**Pros:** Most mature ecosystem
**Cons:** Slow, callback-heavy, Passport strategies are maintenance burden
**Verdict:** Legacy approach, no advantage over Hono

---

## Recommended Architecture

```
Client (Tauri Desktop)
  │ Authorization: Bearer <jwt>
  │
  ├── POST /api/auth/sign-up        → Better Auth (auto)
  ├── POST /api/auth/sign-in/email  → Better Auth (auto)
  ├── GET  /api/auth/sign-in/social → Better Auth Google OAuth
  ├── POST /api/auth/sign-out       → Better Auth (auto)
  │
  ├── GET  /api/sync/pull           → {collections: [...], environments: [...], lastSync}
  ├── POST /api/sync/push           → {changes: [...], deletions: [...]}
  │
  └── GET  /api/health              → {status: "ok", timestamp}
```

### Tech Stack

```
Hono v4 + @hono/node-server     → HTTP framework
Better Auth + JWT plugin         → Authentication
Drizzle ORM + postgres driver    → Database
Zod                              → Env validation
Pino (via hono/logger)           → Logging
PM2                              → Process management
```

### Database Schema

Better Auth auto-generates: `user`, `session`, `account`, `verification`
Custom tables:
- `user_files` — JSON blobs per user (collections + environments)
  - `id`, `user_id`, `filename`, `content` (jsonb), `updated_at`, `created_at`

### Directory Structure

```
backend/
├── src/
│   ├── index.ts              # Entry: create app + serve
│   ├── app.ts                # Hono app, middleware, route mounting
│   ├── auth.ts               # Better Auth instance config
│   ├── env.ts                # Zod env validation
│   ├── db/
│   │   ├── client.ts         # Drizzle client
│   │   ├── schema.ts         # Drizzle table definitions
│   │   └── auth-schema.ts    # Better Auth generated schema
│   ├── routes/
│   │   ├── health.ts
│   │   └── sync.ts           # Pull/Push endpoints
│   ├── middleware/
│   │   ├── auth-guard.ts     # JWT extraction + user context
│   │   └── error-handler.ts
│   └── types/
│       └── context.ts        # Hono context variable types
├── drizzle/                  # Generated migrations
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Revised Phase Plan

| # | Phase | Effort | Changes from Original |
|---|---|---|---|
| 01 | Project Setup (Hono + Better Auth) | 2h | NEW: Hono replaces Fastify, Better Auth config |
| 02 | Database Schema + Auth Schema | 1.5h | SIMPLER: Better Auth auto-gen + 1 custom table |
| 03 | Sync Endpoints (Pull/Push) | 3h | CHANGED: Pull/Push replaces file-based |
| 04 | Deployment (PM2 + systemd) | 2h | CHANGED: PM2 replaces Docker |
| 05 | Desktop Sync Login UI | 3h | KEPT: Better Auth React SDK simplifies |

**Total: ~11.5h** (down from 20h original estimate)

---

## Implementation Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Better Auth JWT plugin maturity | Medium | Test early in Phase 01; fallback to manual JWT if needed |
| Tauri HTTP plugin + Bearer token | Low | Already working in current app for API calls |
| Hono rate limiting on auth routes | Low | Hono built-in rate-limit middleware sufficient |
| Google OAuth redirect in desktop app | Medium | Use localhost callback + deep link; test early |
| Schema migration when adding team features | Low | Drizzle migrations handle additive changes well |

---

## Success Metrics

- [ ] Auth endpoints working (register, login, Google OAuth, logout)
- [ ] JWT token issued and validated on sync endpoints
- [ ] Pull/Push sync working for collections + environments
- [ ] PM2 running stable on server with auto-restart
- [ ] Desktop app can login, sync, and work offline
- [ ] Response time < 100ms for sync endpoints

---

## Unresolved Questions

1. **Google OAuth redirect:** How to handle OAuth callback in Tauri desktop app? (localhost redirect vs custom protocol)
2. **Conflict resolution detail:** Current client uses LWW by `updated_at` — does pull/push need to return conflict metadata?
3. **Rate limiting specifics:** How strict for auth endpoints? (e.g., 5 login attempts / 15min?)
4. **Future team features:** When adding workspaces, should `user_files` gain a `workspace_id` column or create separate `workspace_files` table?

---

## References

- [Better Auth + Hono Integration](https://better-auth.com/docs/integrations/hono)
- [Research Report](../reports/researcher-260309-1958-better-auth-hono-integration-research.md)
- [Original Plan](../260308-1247-localman-backend-server/plan.md)
