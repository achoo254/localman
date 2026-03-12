# Phase 2: Client Sync Engine Refactor

## Context

- [Phase 1](./phase-01-backend-entity-storage-workspace.md) — backend entity APIs must be complete
- [Current sync store](../../src/stores/sync-store.ts) — dual-mode legacy+cloud sync
- [Current cloud sync service](../../src/services/sync/cloud-sync-service.ts) — blob pull/push
- [Current Dexie schema](../../src/db/database.ts) — v2
- [Current models](../../src/types/models.ts) — Collection, Folder, ApiRequest, Environment

## Overview

- **Priority:** P1
- **Status:** Complete
- **Effort:** 16h
- **Description:** Replace blob-based cloud sync with entity-level sync. Add workspace awareness to Dexie schema. Remove legacy sync code. Add `is_synced` toggle and offline change queue.

## Key Insights

- Current Dexie schema already stores entities separately (collections, folders, requests) — no schema change needed for entity structure
- Need to add `workspace_id`, `is_synced`, `version` fields to Dexie tables
- Current sync exports collections to Postman format blob → send as single JSON. Must change to entity-level push/pull
- Legacy sync code (4-endpoint model) can be fully removed
- Offline change queue: new Dexie table `pending_changes` to track mutations while offline

## Requirements

### Functional
- F1: Entity-level sync — push/pull individual collections, folders, requests, environments
- F2: Workspace-aware: sync scoped to workspace OR personal synced items
- F3: `is_synced` toggle per collection — user chooses which personal collections sync
- F4: Offline change queue — track changes when offline, replay on reconnect
- F5: Remove all legacy sync code and types
- F6: Delta sync — only fetch entities changed since last sync

### Non-Functional
- NF1: Dexie schema migration v2→v3 without data loss
- NF2: Sync operations non-blocking (run in background)
- NF3: Offline-first preserved — all writes go to IndexedDB first

## Architecture

### Dexie Schema Changes (v3)

```typescript
this.version(3).stores({
  collections: 'id, name, workspace_id, user_id, is_synced, sort_order, updated_at',
  folders: 'id, collection_id, parent_id, [collection_id+parent_id], sort_order, updated_at',
  requests: 'id, collection_id, folder_id, [collection_id+folder_id], sort_order, updated_at',
  environments: 'id, name, workspace_id, user_id, is_synced, updated_at',
  history: '++id, request_id, timestamp, method, status_code',
  settings: 'key',
  // NEW: offline change queue
  pending_changes: '++id, entity_type, entity_id, action, workspace_id, created_at',
}).upgrade(tx => {
  // Add default values for new fields on existing records
  tx.table('collections').toCollection().modify(c => {
    c.workspace_id = null;
    c.user_id = null;
    c.is_synced = false;
    c.version = 1;
  });
  tx.table('environments').toCollection().modify(e => {
    e.workspace_id = null;
    e.user_id = null;
    e.is_synced = false;
    e.version = 1;
  });
});
```

### Updated Type Interfaces

```typescript
// Additions to Collection
interface Collection {
  // ... existing fields
  workspace_id: string | null;  // null = personal
  user_id: string | null;       // owner (set after login)
  is_synced: boolean;           // user toggle for personal sync
  version: number;              // optimistic locking counter
}

// Additions to Environment
interface Environment {
  // ... existing fields
  workspace_id: string | null;
  user_id: string | null;
  is_synced: boolean;
  version: number;
}

// Additions to Folder, ApiRequest
interface Folder { /* ... */ version: number; }
interface ApiRequest { /* ... */ version: number; }

// New: Pending change entry
interface PendingChange {
  id?: number;
  entity_type: 'collection' | 'folder' | 'request' | 'environment';
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, unknown>; // field-level changes
  base_version: number;
  workspace_id: string | null;
  created_at: string;
}
```

### New Sync Engine Architecture

```
┌─────────────────────────────────────┐
│        Entity Sync Service          │
│  ┌───────────────┐ ┌─────────────┐ │
│  │ Pull Service  │ │ Push Service│ │
│  │ GET /changes  │ │ POST /push  │ │
│  │ since=X       │ │ batch ops   │ │
│  └───────┬───────┘ └──────┬──────┘ │
│          │                │        │
│  ┌───────▼────────────────▼──────┐ │
│  │     Reconciliation Engine     │ │
│  │  - Compare local vs server    │ │
│  │  - Apply remote changes       │ │
│  │  - Queue local changes        │ │
│  └───────────────┬───────────────┘ │
│                  │                 │
│  ┌───────────────▼───────────────┐ │
│  │     Offline Change Queue      │ │
│  │  pending_changes Dexie table  │ │
│  │  - Track mutations offline    │ │
│  │  - Replay on reconnect       │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Sync Flow (Pull)

```
1. GET /api/sync/changes?since={lastSyncAt}&workspace_id={wsId}
2. Server returns: { collections: [...], folders: [...], requests: [...], environments: [...], serverTime }
3. For each entity:
   a. If local doesn't exist → insert into Dexie
   b. If local exists and server.version > local.version → update Dexie
   c. If local exists and local has pending_changes → skip (will merge in Phase 4)
4. Update lastSyncAt = serverTime
```

### Sync Flow (Push)

```
1. Collect all pending_changes from Dexie
2. Group by workspace_id
3. POST /api/sync/push { changes: [...], workspace_id }
4. Server processes each change:
   - Create: insert entity, return server id + version
   - Update: check version match, apply, return new version
   - Delete: soft delete, return confirmation
5. On success: delete processed pending_changes, update local version numbers
6. On version conflict (409): mark for conflict resolution (Phase 4)
```

## Related Code Files

### Files to Create
- `src/services/sync/entity-sync-service.ts` — new entity-level sync logic
- `src/services/sync/offline-change-queue.ts` — pending_changes management
- `src/services/sync/sync-reconciliation.ts` — local vs server comparison
- `src/types/entity-sync.ts` — new sync types (PendingChange, SyncChangesResponse, etc.)

### Files to Modify
- `src/db/database.ts` — bump to v3, add pending_changes table, add fields
- `src/types/models.ts` — add workspace_id, user_id, is_synced, version to models
- `src/stores/sync-store.ts` — remove legacy mode, use entity sync service
- `src/stores/collections-store.ts` — write to pending_changes on mutations
- `src/types/cloud-sync.ts` — update CloudSyncConfig (remove blob-related fields)
- `src/services/sync/cloud-auth-client.ts` — keep auth, add workspace API calls

### Files to Delete
- `src/services/sync/sync-http-client.ts` — legacy 4-endpoint client
- `src/services/sync/sync-service.ts` — legacy sync orchestration
- `src/services/sync/cloud-sync-service.ts` — blob-based cloud sync (replaced)
- `src/types/sync.ts` — legacy sync types

## Implementation Steps

1. **Update type interfaces** (`models.ts`)
   - Add `workspace_id`, `user_id`, `is_synced`, `version` to Collection, Environment
   - Add `version` to Folder, ApiRequest
   - Ensure all fields optional for backward compat during migration

2. **Create `PendingChange` type** (`entity-sync.ts`)
   - Type definitions for pending changes, sync responses, sync push payloads

3. **Bump Dexie schema to v3** (`database.ts`)
   - Add `pending_changes` table
   - Add indexes for new fields
   - Write upgrade handler to set defaults on existing records

4. **Implement offline change queue** (`offline-change-queue.ts`)
   - `addChange(entityType, entityId, action, changes, baseVersion)` — enqueue
   - `getChanges(workspaceId?)` — retrieve pending changes
   - `clearChanges(ids)` — remove processed changes
   - `hasChanges(entityId)` — check if entity has pending local changes

5. **Instrument collections-store.ts**
   - After every create/update/delete in Dexie, also write to pending_changes
   - Only when user is authenticated and collection is_synced or in workspace

6. **Implement entity sync service** (`entity-sync-service.ts`)
   - `pullChanges(config, workspaceId?, since?)` — fetch and apply remote changes
   - `pushChanges(config, workspaceId?)` — push pending_changes to server
   - `syncAll(config)` — orchestrate pull then push for all workspaces + personal synced

7. **Implement reconciliation** (`sync-reconciliation.ts`)
   - `applyRemoteChanges(entities)` — compare versions, update local Dexie
   - Skip entities with local pending_changes (defer to Phase 4 merge)

8. **Refactor sync-store.ts**
   - Remove `SyncMode` type (no more legacy mode)
   - Remove legacy config, legacy sync actions
   - Use `entitySyncService` instead of `cloudSyncAll`
   - Add workspace list state
   - Add per-workspace sync status

9. **Update cloud-auth-client.ts**
   - Add workspace API calls: `listWorkspaces`, `createWorkspace`, `joinWorkspace`
   - Keep existing auth methods

10. **Delete legacy files**
    - Remove `sync-http-client.ts`, `sync-service.ts`, `cloud-sync-service.ts`, `types/sync.ts`
    - Remove all imports/references to these files

11. **Test sync flow end-to-end**
    - Create personal collection → toggle is_synced → sync → verify on server
    - Create workspace collection → sync → verify
    - Offline: make changes → queue populated → go online → push → queue cleared

## Todo List

- [x] Update `models.ts` with workspace_id, user_id, is_synced, version fields
- [x] Create `entity-sync.ts` types
- [x] Bump Dexie schema to v3 with pending_changes + upgrade handler
- [x] Implement `offline-change-queue.ts`
- [x] Instrument `collections-store.ts` to write pending_changes
- [x] Implement `entity-sync-service.ts` (pull + push)
- [x] Implement `sync-reconciliation.ts`
- [x] Refactor `sync-store.ts` — remove legacy, add workspace awareness
- [x] Update `cloud-auth-client.ts` with workspace API calls
- [x] Delete legacy sync files
- [x] Remove legacy sync imports across codebase
- [x] Test Dexie v3 migration with existing data
- [x] Test entity sync pull/push flow
- [x] Test offline queue → reconnect → push flow

## Success Criteria

- Legacy sync code fully removed, no import errors
- Dexie v3 migration preserves all existing data
- Entity-level sync: create/update/delete individual requests propagate to server
- `is_synced` toggle: only synced personal collections push to server
- Offline changes queued and replayed on reconnect
- Workspace collections sync with proper scoping
- `pnpm type-check` passes with zero errors

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Dexie migration breaks existing data | High | Test upgrade handler thoroughly, backup DB before migration |
| collections-store.ts too many changes | Medium | Minimal instrumentation: just add pending_changes calls |
| Circular dependency sync-store ↔ collections-store | Medium | Use event-based decoupling or separate sync trigger |
| Large collections slow to sync | Low | Pagination in Phase 4; initial sync is full fetch |

## Security Considerations

- Token stored in IndexedDB settings (existing) — no change
- Workspace API calls must include auth header
- Never expose other users' personal collections
- `pending_changes` may contain sensitive data — stays local in IndexedDB

## Next Steps

- Phase 3: WebSocket will replace polling — entity sync service will be called on WS events
- Phase 4: Conflict resolution when push returns 409 version mismatch
