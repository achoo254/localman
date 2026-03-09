---
title: "Localman Backend — Hono + Better Auth"
description: "Backend server with Hono, Better Auth, Drizzle/PostgreSQL for auth and pull/push cloud sync"
status: complete
priority: P1
effort: 11.5h
branch: main
tags: [backend, hono, better-auth, sync, drizzle, postgresql]
created: 2026-03-09
---

# Localman Backend — Hono + Better Auth

## Goal

Build a lightweight Node.js backend in `backend/` monorepo directory providing:
1. User auth (email/password + Google OAuth) via Better Auth
2. Pull/Push cloud sync for collections + environments
3. PM2 + systemd deployment (no Docker)

## Architecture

```
Client (Tauri) ── Bearer JWT ──> Hono API ──> PostgreSQL
                                  ├── /api/auth/*   (Better Auth handler)
                                  ├── /api/sync/pull (GET)
                                  ├── /api/sync/push (POST)
                                  └── /api/health    (GET)
```

**Data model:** Server = dumb JSON store. `user_files` table with jsonb `content`. Client owns conflict resolution (LWW by `updated_at`).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Hono v4 + @hono/node-server |
| Auth | Better Auth + JWT plugin |
| ORM | Drizzle ORM + PostgreSQL |
| Validation | Zod (env vars) |
| Deploy | PM2 + systemd + Nginx |

## Phases

| # | Phase | Status | Effort |
|---|---|---|---|
| 01 | [Project Setup](./phase-01-project-setup-hono-better-auth.md) | complete | 2h |
| 02 | [Database Schema + Auth](./phase-02-database-schema-and-auth.md) | complete | 1.5h |
| 03 | [Sync Endpoints](./phase-03-sync-endpoints-pull-push.md) | complete | 3h |
| 04 | [Deployment](./phase-04-deployment-pm2-systemd.md) | complete | 2h |
| 05 | [Desktop Sync Login UI](./phase-05-desktop-sync-login-ui.md) | complete | 3h |

## Key Constraints

- Server is dumb store; client handles LWW conflict resolution
- Bearer JWT (not cookies) — desktop app has no cookie jar
- No email verification in Phase A
- Monorepo: `backend/` dir, pnpm workspace
- Environments synced alongside collections

## Validation Log

### Session 1 — 2026-03-09
**Trigger:** Post-plan validation

1. **JWT transport** → Confirmed: Better Auth JWT plugin returns token in response body (not cookie)
2. **Environment format** → Use Postman format for environment export/sync
3. **Port** → 3001 confirmed
4. **Old plan** → Deleted (260308-1247-localman-backend-server)
5. **PostgreSQL** → Already installed on server; Phase 04 only creates DB + user
6. **Server OS** → Ubuntu/Debian
7. **Nginx/SSL** → Nginx reverse proxy only; SSL deferred to later

## Reports

- [Brainstorm](../reports/brainstorm-260309-1951-localman-backend-hono-better-auth.md)
- [Research: Better Auth + Hono](../reports/researcher-260309-1958-better-auth-hono-integration-research.md)
