---
title: "Cloud Sync → Team Workspace Architecture"
description: "Replace blob-based cloud sync with entity-level storage, team workspaces, WebSocket real-time, and field-level merge"
status: in-progress
priority: P1
effort: 80h
branch: feat/team-workspace
tags: [backend, frontend, sync, websocket, team, database]
created: 2026-03-10
---

# Cloud Sync → Team Workspace Architecture

## Overview

Full rearchitecture of Localman's cloud sync from "dumb blob store" per-user to team workspace collaboration with real-time updates and smart conflict resolution.

## Context

- Brainstorm: [brainstorm report](../reports/brainstorm-260310-2204-cloud-sync-team-architecture.md)
- Research: [Hono WebSocket](../reports/researcher-01-hono-websocket.md) | [Field-level merge](../reports/researcher-02-field-level-merge.md)

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Backend: Normalized schema + Workspace RBAC | Complete | 20h | [phase-01](./phase-01-backend-entity-storage-workspace.md) |
| 2 | Client: Sync engine refactor + entity-level sync | ✅ Complete | 16h | [phase-02](./phase-02-client-sync-engine-refactor.md) |
| 3 | WebSocket real-time server + client | ✅ Complete | 16h | [phase-03](./phase-03-websocket-real-time.md) |
| 4 | Field-level merge + conflict resolution UI | Pending | 16h | [phase-04](./phase-04-field-level-merge-conflict-ui.md) |
| 5 | UI overhaul: workspace panel + presence | Pending | 12h | [phase-05](./phase-05-ui-overhaul-workspace.md) |

## Dependencies

```
Phase 1 (backend) → Phase 2 (client sync) → Phase 3 (WebSocket) → Phase 4 (merge)
                                                                  ↘ Phase 5 (UI)
```

Phase 5 can start after Phase 3, runs parallel with Phase 4.

## Key Decisions

- Remove legacy 4-endpoint sync entirely
- Workspace model (like Postman Teams): owner/editor/viewer
- WebSocket full real-time (not polling)
- Field-level merge + optimistic locking (not CRDT)
- Personal collections: user-toggleable sync per collection
- `ws` library alongside Hono (separate upgrade handler on same server)

## What Gets Removed

- `src/services/sync/sync-http-client.ts` — legacy sync client
- `src/services/sync/sync-service.ts` — legacy sync orchestration
- `src/types/sync.ts` — legacy sync types
- Legacy sync section in `sync-settings.tsx`
- `backend/src/db/schema.ts` → `userFiles` table (after migration)

## Validation Log

| # | Question | Decision |
|---|----------|----------|
| 1 | Redis vs in-memory for WS channels | In-memory `Map<channel, Set<ws>>`. Add Redis when horizontal scaling needed |
| 2 | Invite flow | Invite link only (copy & share). No email service required |
| 3 | Data migration strategy | Manual script (`pnpm db:migrate-data`). Run once, controlled |
| 4 | Change log cleanup | TTL 30 days. Cron job deletes older entries |

## Migration Strategy

1. Create new normalized tables alongside `userFiles`
2. Write migration script: parse blob JSON → insert into entity tables
3. Keep `userFiles` as backup until migration confirmed
4. Drop `userFiles` after Phase 2 stable
