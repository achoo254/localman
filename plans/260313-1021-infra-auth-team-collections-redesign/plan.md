---
title: "Infra, Auth & Team Collections Redesign"
description: "Replace Better Auth with Firebase Auth, remove server URL config, add sidebar workspace sections"
status: completed
priority: P1
effort: 16h
branch: main
tags: [auth, infra, frontend, backend]
created: 2026-03-13
---

# Infra, Auth & Team Collections Redesign

## Overview

Replace Better Auth with Firebase Auth (Google Login only), remove manual server URL config, and redesign sidebar with Personal + Team collection sections. Clean slate — no migration needed.

**Brainstorm:** [brainstorm report](../reports/brainstorm-260313-0914-infra-auth-team-collections-redesign.md)

## Architecture

```
Cloud Server (same domain):
  Nginx → FE static at / → reverse proxy /api/* → BE :3001
  BE: Hono + PM2 (single JS bundle)
  DB: PostgreSQL

Firebase Auth: Google Login (Spark tier, new project)

Tauri Desktop: offline-first, VITE_API_URL build-time env
```

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Firebase Auth Migration | Complete | 8h | [phase-01](./phase-01-firebase-auth-migration.md) |
| 2 | Server URL Removal + Deployment | Complete | 4h | [phase-02](./phase-02-server-url-and-deployment.md) |
| 3 | Sidebar Workspace Sections | Complete | 4h | [phase-03](./phase-03-sidebar-workspace-sections.md) |

## Dependencies

- Phase 1 → Phase 2 (auth must work before simplifying URL config)
- Phase 2 → Phase 3 (deployment config needed before UI changes)
- Firebase project must be created before Phase 1 implementation

## Key Decisions

| Decision | Choice |
|---|---|
| Auth provider | Firebase Auth (Google Login only) |
| Migration | Clean slate |
| Sidebar UX | Sections (Personal + Team visible together) |
| Offline auth | Local-only mode (no auth needed offline) |
| Domain | Same domain (FE `/`, BE `/api/*`) |
| Multi-account | No (1 account, logout to switch) |
