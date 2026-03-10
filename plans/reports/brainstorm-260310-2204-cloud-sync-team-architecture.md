# Brainstorm: Cloud Sync → Team Workspace Architecture

**Date:** 2026-03-10
**Status:** Agreed
**Approach:** Phased Custom Build (Approach A)

---

## Problem Statement

Current cloud sync = "dumb server" blob store per-user. Needs full rearchitecture to support:
- Team workspaces with shared collections
- Real-time collaboration (WebSocket)
- Field-level merge with conflict resolution
- Personal collection sync (user-toggleable)

### What's Being Replaced
- `userFiles` blob table → normalized entity tables
- Full JSON pull/push → delta/entity-level sync
- LWW conflict resolution → field-level merge + version tracking
- HTTP-only sync → WebSocket real-time + HTTP data transfer
- Legacy 4-endpoint custom sync → **removed entirely**

---

## Agreed Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Team model | Workspace (like Postman Teams) | Organized, scalable, clear ownership |
| Legacy sync | Remove | Reduce code, single sync path |
| Conflict resolution | Field-level merge + optimistic lock | Sufficient for structured API data, not overkill |
| Real-time | Full WebSocket | Best UX, no time constraint |
| Personal sync | User-toggleable per collection | Flexibility: offline-only or synced for backup |
| Timeline | No limit | Do it right |

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────┐
│  Desktop Client (Tauri + React)                 │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ IndexedDB  │  │ Zustand  │  │  WS Client   │ │
│  │ (Dexie)   │  │ Stores   │  │  (per-ws)    │ │
│  │ offline   │  │          │  │              │ │
│  │ source of │◄─┤ UI state │◄─┤ real-time    │ │
│  │ truth     │  │          │  │ events       │ │
│  └─────┬─────┘  └──────────┘  └──────┬───────┘ │
│        │                              │         │
│  ┌─────▼──────────────────────────────▼───────┐ │
│  │         Sync Engine (new)                  │ │
│  │  - Delta tracker (change log local)        │ │
│  │  - Conflict resolver (field-level)         │ │
│  │  - Queue manager (offline changes)         │ │
│  └─────────────────────┬──────────────────────┘ │
└────────────────────────┼────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────┼────────────────────────┐
│  Backend (Hono + PostgreSQL)                    │
│  ┌─────────────┐  ┌───▼──────┐  ┌───────────┐  │
│  │ Better Auth │  │ REST API │  │ WS Server │  │
│  │ (auth +     │  │ CRUD     │  │ broadcast │  │
│  │  sessions)  │  │ entities │  │ per-ws    │  │
│  └─────────────┘  └────┬─────┘  └─────┬─────┘  │
│                        │              │         │
│  ┌─────────────────────▼──────────────▼───────┐ │
│  │  Workspace Service                         │ │
│  │  - RBAC (owner/editor/viewer)              │ │
│  │  - Invites & member management             │ │
│  │  - Merge engine (field-level + versioning) │ │
│  └─────────────────────┬──────────────────────┘ │
│                        │                        │
│  ┌─────────────────────▼──────────────────────┐ │
│  │  PostgreSQL (Drizzle ORM)                  │ │
│  │  Normalized tables + change_log            │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Database Schema (New)

```sql
-- Team/Workspace
workspaces(id, name, slug, owner_id, plan, created_at, updated_at)
workspace_members(workspace_id, user_id, role[owner|editor|viewer], invited_by, joined_at)
workspace_invites(id, workspace_id, email, role, token, expires_at, accepted_at)

-- Collections (normalized, not blob)
collections(id, workspace_id, user_id, name, description, parent_id, sort_order, is_synced, version, created_at, updated_at, deleted_at)
requests(id, collection_id, name, method, url, headers_json, body_json, auth_json, params_json, pre_script, post_script, sort_order, version, created_at, updated_at, deleted_at)
folders(id, collection_id, name, parent_id, sort_order, version, created_at, updated_at, deleted_at)

-- Environments
environments(id, workspace_id, user_id, name, variables_json, is_synced, version, created_at, updated_at, deleted_at)

-- Sync & Conflict
change_log(id, entity_type, entity_id, workspace_id, user_id, field_changes_json, from_version, to_version, created_at)

-- Notes:
-- user_id on collections/environments = owner for personal items
-- workspace_id = null for personal (non-workspace) items
-- is_synced = user toggle for personal collection sync
-- deleted_at = soft delete for sync propagation
-- version = monotonic counter for optimistic locking
```

### WebSocket Protocol

```
Client → Server:
  { type: "subscribe", workspace_id: "ws_123" }
  { type: "unsubscribe", workspace_id: "ws_123" }
  { type: "entity:update", entity_type: "request", entity_id: "req_1", base_version: 5, changes: { url: "...", method: "POST" } }
  { type: "entity:create", entity_type: "request", collection_id: "col_1", data: {...} }
  { type: "entity:delete", entity_type: "request", entity_id: "req_1" }
  { type: "presence", workspace_id: "ws_123", status: "editing", entity_id: "req_1" }

Server → Client:
  { type: "entity:updated", entity_type: "request", entity_id: "req_1", version: 6, changes: {...}, user_id: "u_2" }
  { type: "entity:created", ... }
  { type: "entity:deleted", ... }
  { type: "conflict", entity_type: "request", entity_id: "req_1", server_version: 6, server_fields: {...}, client_fields: {...} }
  { type: "presence", user_id: "u_2", status: "editing", entity_id: "req_1" }
  { type: "members:updated", workspace_id: "ws_123", members: [...] }
```

### Field-Level Merge Algorithm

```
On server receive entity:update(entity_id, base_version, changes):
  1. Lock entity row (SELECT FOR UPDATE)
  2. If server.version == base_version:
     → Apply changes, version++, broadcast, return OK
  3. If server.version > base_version:
     → Get change_log entries from base_version to current
     → Extract which fields changed on server since base_version
     → Compare with client's changed fields
     → If NO field overlap: auto-merge both, version++, broadcast
     → If field overlap: return CONFLICT with both versions
  4. Client receives CONFLICT → show diff UI → user picks winner
```

### Offline Queue (Personal Synced + Team)

```
When offline:
  - All changes written to IndexedDB immediately (existing behavior)
  - Changes also queued in local `pending_changes` store
  - Each entry: { entity_type, entity_id, action, changes, base_version, timestamp }

When reconnected:
  - Send queued changes via WebSocket in order
  - Server processes each, may return conflicts
  - Client resolves conflicts (auto-merge or prompt user)
  - Clear queue entries as acknowledged
```

---

## Implementation Phases

### Phase 1: Backend Entity-Level Storage + Workspace
- New Drizzle schema (workspaces, collections, requests, etc.)
- Migrations from `userFiles` blob → normalized tables
- REST API: CRUD for workspaces, collections, requests, environments
- Workspace RBAC middleware
- Invite system (email-based)
- **Deliverable:** Team can share collections via HTTP API

### Phase 2: Client Sync Engine Refactor
- Refactor Dexie schema to match server entity model
- Replace blob sync with entity-level sync
- `is_synced` toggle per collection/environment
- Delta tracking: local change log in IndexedDB
- HTTP-based sync (pull/push entities, not blobs)
- **Deliverable:** Personal + team sync works via HTTP polling

### Phase 3: WebSocket Real-time
- Hono WebSocket server (or separate ws service)
- Channel management per workspace
- Client WebSocket manager with reconnection logic
- Broadcast entity changes to workspace members
- Presence indicators (who's editing what)
- **Deliverable:** Real-time updates in team workspaces

### Phase 4: Field-Level Merge + Conflict UI
- Version tracking per entity
- Server-side merge engine
- Conflict detection and auto-merge when possible
- Client conflict resolution UI (diff view, pick winner)
- Offline queue processing with merge
- **Deliverable:** Full conflict resolution, safe concurrent editing

### Phase 5: UI Overhaul
- Remove legacy sync UI entirely
- New Settings → Account & Workspaces panel
- Workspace switcher in sidebar
- Member management UI
- Presence avatars in request editor
- Sync status per workspace
- **Deliverable:** Complete team UX

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| WebSocket scaling | High | Start single-server; add Redis pub/sub when needed |
| Data migration from blob | Medium | Write migration script blob→entities; keep backup |
| Offline conflict queue explosion | Medium | Cap queue size; force sync before queue > N items |
| Complex merge UI | Medium | Start with "pick A or B"; add field-level diff later |
| IndexedDB schema migration | Medium | Dexie upgrade handlers; version bump carefully |

---

## What Gets Removed

- `src/services/sync/sync-http-client.ts` — legacy 4-endpoint client
- `src/services/sync/sync-service.ts` — legacy sync orchestration
- `src/types/sync.ts` — legacy sync types
- Legacy sync UI in `sync-settings.tsx` (collapsible advanced section)
- `backend/src/db/schema.ts` `userFiles` table (after migration)

## What Gets Refactored

- `src/stores/sync-store.ts` → workspace-aware, WebSocket integration
- `src/services/sync/cloud-sync-service.ts` → entity-level sync engine
- `src/services/sync/cloud-auth-client.ts` → add workspace API calls
- `src/components/settings/sync-settings.tsx` → Account & Workspaces panel
- `src/components/settings/cloud-login-form.tsx` → keep auth, add workspace context
- `backend/src/routes/sync.ts` → entity CRUD + workspace routes
- `backend/src/db/schema.ts` → normalized tables

---

## Success Metrics

- Team members see changes within 1s (WebSocket latency)
- Auto-merge succeeds >90% of concurrent edits (different fields)
- Offline queue resolves cleanly on reconnect
- Personal collections work fully offline (no regression)
- Zero data loss in conflict scenarios (user always picks winner)

---

## Unresolved Questions

1. **WebSocket library choice** — Hono native ws? Or separate service (e.g., Socket.io, ws)? Need to evaluate Hono ws maturity.
2. **Max workspace size** — Should we limit collections/members per workspace for free tier?
3. **History sync** — Should request execution history sync within team? Could be large.
4. **Script sync security** — Pre/post scripts shared in team = potential code injection. Need sandboxing review.
5. **Migration path** — Users with existing cloud sync data (blob format) need smooth migration to entity-level.
