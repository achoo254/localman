---
title: "Localman Backend Server (Phase A)"
description: "Fastify + PostgreSQL backend with JWT auth and file-based sync endpoints compatible with existing client"
status: pending
priority: P1
effort: 20h
branch: main
tags: [backend, fastify, auth, sync, docker]
created: 2026-03-08
---

# Localman Backend Server (Phase A)

## Goal

Build a Node.js + Fastify backend that provides:
1. User authentication (JWT access + refresh tokens)
2. File-based sync API (collections + environments) backward-compatible with existing client sync code
3. Docker Compose dev environment (PostgreSQL + App, no Redis)
4. Sync Login UI in desktop app (Phase 06)

## Architecture

```
Client (Tauri Desktop)
  │
  ├── GET  /api/sync/list          → [{filename, updated_at}]
  ├── GET  /api/sync/download/:fn  → Postman JSON or env JSON text
  ├── PUT  /api/sync/upload/:fn    → stores JSON blob
  ├── DELETE /api/sync/delete/:fn  → removes file
  │
  ├── POST /api/auth/register
  ├── POST /api/auth/login         → access token + refresh token (httpOnly cookie)
  ├── POST /api/auth/logout        → revokes token via revoked_tokens table
  └── POST /api/auth/refresh
```

**Storage model:** Each user's files stored as JSON blobs in `user_files` table. Collections as `{id}.json`, environments as `env_{id}.json`. No normalized tables needed for Phase A.

**Auth flow:** Access token (15min, Bearer header) + Refresh token (7d, httpOnly cookie). Token blacklist via PostgreSQL `revoked_tokens` table (no Redis).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Fastify 5 + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Auth | @fastify/jwt + @fastify/cookie |
| Validation | JSON Schema (Fastify native) + Zod (env) |
| Containerization | Docker + docker-compose |

## Phases

| # | Phase | Status | Effort |
|---|---|---|---|
| 01 | [Project Setup](./phase-01-project-setup.md) | pending | 3h |
| 02 | [Database Schema](./phase-02-database-schema.md) | pending | 2h |
| 03 | [Auth Endpoints](./phase-03-auth-endpoints.md) | pending | 4h |
| 04 | [Sync Endpoints](./phase-04-sync-endpoints.md) | pending | 4h |
| 05 | [Docker Deployment](./phase-05-docker-deployment.md) | pending | 3h |
| 06 | [Desktop Sync Login UI](./phase-06-desktop-sync-login-ui.md) | pending | 4h |

## Key Constraints

- **Backward compatibility:** Client uses `SyncConfig.endpoints` with `{filename}` template. Backend MUST return `[{filename, updated_at}]` from list endpoint.
- **Client exports Postman JSON:** Upload body is raw Postman v2.1 JSON text for collections; env JSON for environments.
- **Single-user focus:** No workspaces or team features in Phase A.
- **LWW on client side:** Server is a dumb file store; conflict resolution happens in client `reconcile()`.
- **No Redis:** Token blacklist uses PostgreSQL `revoked_tokens` table with TTL-based cleanup.

## Dependencies

- Docker Desktop (for local dev)
- Node.js 20+
- pnpm

## Reports

- [Fastify patterns](../reports/researcher-260308-1246-fastify-typescript-backend-patterns.md)
- [Sync API design](../reports/researcher-260308-1247-backend-sync-api-design.md)
- [Feature roadmap](../reports/brainstorm-260308-1236-next-features-roadmap.md)

## Validation Log

### Session 1 — 2026-03-08
**Trigger:** Pre-implementation validation
**Questions asked:** 6

#### Questions & Answers

1. **[Auth UX]** Auth flow for sync: manual header vs sync login UI in desktop app
   - Options: Thêm sync login UI vào desktop app | Manual headers thủ công
   - **Answer:** Thêm sync login UI vào desktop app
   - **Rationale:** Better UX; Phase 06 added to plan to implement login form in desktop Settings.

2. **[Database]** MongoDB vs PostgreSQL
   - Options: MongoDB Atlas | PostgreSQL (long-term recommended) | Both
   - **Answer:** Giữ PostgreSQL
   - **Rationale:** ACID, jsonb support, team features later. Original decision maintained.

3. **[Infrastructure]** Redis necessity for Phase A
   - Options: Bỏ Redis, dùng DB | Giữ Redis
   - **Answer:** Bỏ Redis, dùng DB đơn giản hơn
   - **Rationale:** Less operational complexity. Token blacklist via `revoked_tokens` PostgreSQL table.

4. **[Scope]** Sync environments or collections only
   - Options: Collections only | Must include environments
   - **Answer:** Phải có cả environments
   - **Rationale:** Environments tied to workflow; Phase 04 expanded to sync both entity types.

5. **[Architecture]** Backend repo location
   - Options: Monorepo backend/ | Separate repo
   - **Answer:** Monorepo backend/ trong project hiện tại
   - **Rationale:** Share types with frontend later; pnpm workspace already configured.

#### Confirmed Decisions
- No Redis: use PostgreSQL `revoked_tokens` — simpler infrastructure
- Environments in scope: sync both collections + environments in Phase A
- Phase 06 added: Sync Login UI in desktop app Settings panel
- Monorepo: backend lives in `D:\CONG VIEC\localman\backend\`

#### Action Items
- [x] Remove Redis from tech stack and docker-compose (Phase 02, 05)
- [x] Add `revoked_tokens` table to database schema (Phase 02)
- [x] Expand sync endpoints to handle environments (Phase 04)
- [x] Create phase-06-desktop-sync-login-ui.md (new phase)

#### Impact on Phases
- Phase 02: Remove Redis client, add `revoked_tokens` table
- Phase 03: Auth blacklist uses PostgreSQL instead of Redis
- Phase 04: Sync endpoints handle both collections and environments
- Phase 05: docker-compose has no Redis service
- Phase 06: New — desktop app sync login UI
