# Phase 4: Field-Level Merge + Conflict Resolution UI

## Context

- [Phase 1](./phase-01-backend-entity-storage-workspace.md) — version counters on all entities
- [Phase 3](./phase-03-websocket-real-time.md) — WS broadcasts conflict messages
- [Brainstorm](../reports/brainstorm-260310-2204-cloud-sync-team-architecture.md) — merge algorithm design

## Overview

- **Priority:** P1
- **Status:** ✅ Complete
- **Effort:** 16h
- **Description:** Implement server-side field-level merge engine with optimistic locking. Build client conflict resolution UI for unresolvable conflicts. Handle offline queue replay with merge.

## Key Insights

- API request data is structured with ~10 distinct fields — field-level merge is practical
- Most concurrent edits touch different fields (user A edits URL, user B edits headers) → auto-merge >90%
- Only show conflict UI when same field changed by multiple users
- `change_log` table tracks field-level history for merge decisions
- Offline queue replay: process in order, handle conflicts per-change

## Requirements

### Functional
- F1: Server-side merge engine — auto-merge non-overlapping field changes
- F2: Optimistic locking — reject updates with stale version, return conflict
- F3: Change log — record field-level changes for merge decisions
- F4: Client conflict queue — store unresolved conflicts for UI resolution
- F5: Conflict resolution UI — show diff, let user pick per-field winner
- F6: Offline queue replay — process pending_changes with merge logic on reconnect

### Non-Functional
- NF1: Auto-merge completes in <50ms per entity
- NF2: Conflict UI intuitive — user understands what changed without reading docs
- NF3: No data loss — user always has option to pick either version

## Architecture

### Server Merge Engine

```
Incoming entity:update(entity_id, base_version, changes)
  │
  ├── 1. SELECT entity FOR UPDATE (row lock)
  │
  ├── 2. Check: server.version == base_version?
  │   ├── YES → Apply changes, version++, write change_log, broadcast → OK
  │   │
  │   └── NO (server.version > base_version) →
  │       │
  │       ├── 3. Fetch change_log entries: base_version → server.version
  │       │
  │       ├── 4. Extract server-changed fields set
  │       │
  │       ├── 5. Compare with client-changed fields set
  │       │   ├── NO OVERLAP → Auto-merge both, version++, broadcast → OK
  │       │   │   (apply client changes on top of current server state)
  │       │   │
  │       │   └── OVERLAP → Return CONFLICT
  │       │       { conflicting_fields, server_values, client_values,
  │       │         server_version, auto_merged_fields }
  │       │
  │       └── 6. Write change_log for whatever was merged
  │
  └── Broadcast result to workspace channel
```

### Merge Engine Implementation

```typescript
// backend/src/services/merge-engine.ts

interface MergeResult {
  status: 'applied' | 'auto_merged' | 'conflict';
  version: number;
  auto_merged_fields?: string[];
  conflicting_fields?: string[];
  server_values?: Record<string, unknown>;
  client_values?: Record<string, unknown>;
}

async function mergeEntityUpdate(
  entityType: string,
  entityId: string,
  baseVersion: number,
  clientChanges: Record<string, unknown>,
  userId: string
): Promise<MergeResult> {
  return db.transaction(async (tx) => {
    // 1. Lock row
    const entity = await tx.select().from(table)
      .where(eq(table.id, entityId)).for('update');

    // 2. Version match → direct apply
    if (entity.version === baseVersion) {
      await tx.update(table).set({ ...clientChanges, version: entity.version + 1 });
      await writeChangeLog(tx, entityType, entityId, clientChanges, baseVersion, entity.version + 1, userId);
      return { status: 'applied', version: entity.version + 1 };
    }

    // 3. Version mismatch → check field overlap
    const logs = await tx.select().from(changeLog)
      .where(and(
        eq(changeLog.entityId, entityId),
        gt(changeLog.fromVersion, baseVersion)
      ));

    const serverChangedFields = new Set(logs.flatMap(l => Object.keys(l.fieldChanges)));
    const clientChangedFields = new Set(Object.keys(clientChanges));
    const overlap = [...clientChangedFields].filter(f => serverChangedFields.has(f));

    if (overlap.length === 0) {
      // 4. No overlap → auto-merge
      await tx.update(table).set({ ...clientChanges, version: entity.version + 1 });
      await writeChangeLog(tx, ...);
      return {
        status: 'auto_merged',
        version: entity.version + 1,
        auto_merged_fields: [...clientChangedFields],
      };
    }

    // 5. Overlap → conflict
    const serverValues = Object.fromEntries(overlap.map(f => [f, entity[f]]));
    const clientValues = Object.fromEntries(overlap.map(f => [f, clientChanges[f]]));
    // Auto-merge non-overlapping fields still
    const nonOverlap = Object.fromEntries(
      Object.entries(clientChanges).filter(([k]) => !overlap.includes(k))
    );
    if (Object.keys(nonOverlap).length > 0) {
      await tx.update(table).set({ ...nonOverlap, version: entity.version + 1 });
      await writeChangeLog(tx, ...);
    }

    return {
      status: 'conflict',
      version: entity.version + (Object.keys(nonOverlap).length > 0 ? 1 : 0),
      auto_merged_fields: Object.keys(nonOverlap),
      conflicting_fields: overlap,
      server_values: serverValues,
      client_values: clientValues,
    };
  });
}
```

### Client Conflict Queue

```typescript
// src/services/sync/conflict-queue.ts

interface ConflictEntry {
  id: string; // auto-generated
  entity_type: string;
  entity_id: string;
  entity_name: string; // for display
  conflicting_fields: string[];
  server_values: Record<string, unknown>;
  client_values: Record<string, unknown>;
  server_version: number;
  auto_merged_fields: string[];
  created_at: string;
}

// Store in Zustand (not Dexie — ephemeral, must resolve in session)
```

### Conflict Resolution UI

```
┌─────────────────────────────────────────────────┐
│  ⚠ Conflict: "Login API" request                │
│                                                 │
│  2 fields have conflicting changes:             │
│                                                 │
│  ┌─ URL ──────────────────────────────────────┐ │
│  │ Server (by Bob):  https://api.com/v2/login │ │
│  │ Your version:     https://api.com/v3/login │ │
│  │ [Use Server] [Use Mine] ← per-field pick   │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌─ Method ───────────────────────────────────┐ │
│  │ Server (by Bob):  PUT                      │ │
│  │ Your version:     PATCH                    │ │
│  │ [Use Server] [Use Mine]                    │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  Auto-merged: headers (no conflict)             │
│                                                 │
│  [Accept All Server] [Accept All Mine] [Apply]  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Offline Queue Replay

```
On reconnect with pending_changes:
  1. Sort by created_at ASC
  2. For each change:
     a. Send via HTTP POST /api/sync/push (not WS — more reliable for batch)
     b. If 200 OK → remove from queue, update local version
     c. If auto_merged → remove from queue, update local, show toast
     d. If conflict → add to conflict queue, keep in pending_changes
     e. If network error → stop, retry later
  3. After all processed: show conflict UI if any conflicts
  4. After conflicts resolved: push resolutions
```

## Related Code Files

### Files to Create (Backend)
- `backend/src/services/merge-engine.ts` — field-level merge + auto-merge logic
- `backend/src/services/change-log-service.ts` — write/query change_log

### Files to Create (Frontend)
- `src/services/sync/conflict-queue.ts` — conflict entry management
- `src/services/sync/offline-queue-replay.ts` — process pending_changes with merge
- `src/components/sync/conflict-resolution-dialog.tsx` — conflict UI
- `src/components/sync/conflict-field-diff.tsx` — per-field diff display
- `src/stores/conflict-store.ts` — Zustand store for pending conflicts

### Files to Modify
- `backend/src/routes/entity-sync-routes.ts` — use merge engine for push
- `backend/src/ws/message-router.ts` — use merge engine for WS entity updates
- `src/services/sync/ws-event-handler.ts` — handle conflict messages
- `src/services/sync/entity-sync-service.ts` — use offline-queue-replay on reconnect

## Implementation Steps

### Backend

1. **Create `change-log-service.ts`**
   - `writeChangeLog(tx, entityType, entityId, changes, fromVersion, toVersion, userId)`
   - `getChangesSince(entityId, sinceVersion)` — returns field-level changes

2. **Create `merge-engine.ts`**
   - `mergeEntityUpdate(entityType, entityId, baseVersion, clientChanges, userId)` → MergeResult
   - Transaction with row locking (`SELECT FOR UPDATE`)
   - Three paths: direct apply, auto-merge, conflict

3. **Integrate merge engine into routes**
   - `entity-sync-routes.ts` POST /push uses merge engine per entity
   - `message-router.ts` entity:update uses merge engine, returns result via WS

### Frontend

4. **Create `conflict-store.ts`**
   - `conflicts: ConflictEntry[]`
   - `addConflict(entry)`, `resolveConflict(id, resolutions)`, `clearAll()`
   - `hasConflicts` computed

5. **Create `conflict-queue.ts`**
   - Parse conflict responses from server
   - Add to conflict store
   - Helper: `resolveConflict(conflictId, fieldResolutions: Record<field, 'server'|'client'>)`
   - Sends resolution to server as entity:update with resolved values

6. **Create `offline-queue-replay.ts`**
   - `replayOfflineQueue(config)` — process pending_changes in order
   - Handle each response status: ok, auto_merged, conflict, error
   - Show progress indicator during replay
   - Batch: group changes by entity to reduce requests

7. **Create `conflict-resolution-dialog.tsx`**
   - Modal triggered when conflict-store has entries
   - For each conflict: show entity name, conflicting fields
   - Per-field: server value vs client value with pick buttons
   - Bulk actions: "Accept All Server" / "Accept All Mine"
   - On resolve: send resolution, close dialog
   - Non-dismissable until resolved (prevent data loss)

8. **Create `conflict-field-diff.tsx`**
   - Render field name, server value, client value side by side
   - For JSON fields (headers, body): syntax-highlighted diff
   - For simple fields (url, method): plain text comparison
   - Visual indicator: green for selected, gray for rejected

9. **Hook into ws-event-handler.ts**
   - On `conflict` message: add to conflict store
   - On `auto_merged` result: show toast "Auto-merged: {fields}"
   - Trigger conflict dialog when conflicts > 0

10. **Hook into entity-sync-service.ts**
    - On reconnect: call `replayOfflineQueue` before normal sync
    - After replay: show any conflicts that need resolution

## Todo List

- [x] Create `change-log-service.ts`
- [x] Create `merge-engine.ts` with 3-way merge logic
- [x] Integrate merge engine into entity sync routes
- [x] Integrate merge engine into WS message router
- [x] Create `conflict-store.ts` Zustand store
- [x] Create `conflict-queue.ts` — parse + manage conflicts
- [x] Create `offline-queue-replay.ts` — replay pending changes
- [x] Create `conflict-resolution-dialog.tsx` — main conflict UI
- [x] Create `conflict-field-diff.tsx` — per-field comparison
- [x] Hook conflict handling into ws-event-handler
- [x] Hook offline replay into entity-sync-service reconnect flow
- [x] Test: concurrent edit different fields → auto-merge
- [x] Test: concurrent edit same field → conflict UI
- [x] Test: offline changes → reconnect → replay → resolve conflicts
- [x] Test: bulk conflict resolution (accept all server/mine)

## Success Criteria

- Auto-merge succeeds when no field overlap (>90% of real-world concurrent edits)
- Conflict UI shows clear diff for overlapping fields
- User can resolve per-field or bulk
- No data loss — user always sees both versions
- Offline replay processes in order, handles conflicts gracefully
- Change log accurately tracks all field mutations with versions

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Row locking contention under load | Medium | Short transactions, lock only the entity row |
| Complex JSON diff (body/headers) | Medium | Start with "pick A or B" for JSON; add deep diff later |
| Change log growth | Low | TTL 30 days — cron job deletes older entries (validated) |
| Conflict fatigue (too many conflicts) | Low | Auto-merge handles most; only real conflicts shown |

## Security Considerations

- Merge engine runs in transaction — no partial writes
- Validate user has edit permission before merging
- Change log immutable (append-only) — for audit trail
- Don't expose other users' pending changes

## Next Steps

- Phase 5: conflict count badge in workspace UI
