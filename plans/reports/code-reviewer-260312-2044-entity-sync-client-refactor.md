# Code Review: Phase 2 Client Sync Engine Refactor

**Date:** 2026-03-12
**Reviewer:** code-reviewer
**Score: 7/10**

## Scope

- **Files:** 8 files, 859 LOC total
- **Focus:** Entity-level sync engine (pull/push), offline queue, reconciliation, store integration, DB migration, types

## Overall Assessment

Well-structured refactor from blob-based to entity-level sync. Good separation of concerns (service/queue/reconciliation/store). Clean types. Several medium-severity issues around data consistency and missing sync instrumentation.

---

## Critical Issues

### [C1] `server_time` from pull response is ignored — clock drift risk
**File:** `src/services/sync/entity-sync-service.ts` line 39
**Impact:** `lastSyncAt` is set to local `new Date().toISOString()` (sync-store.ts:183) instead of the server's `server_time`. If client clock is ahead, future pulls will miss changes. If behind, pulls will re-fetch duplicates.
**Fix:** Return `data.server_time` from `pullChanges()` and use it as `lastSyncAt`.

### [C2] Delete bypasses pending-change check in reconciliation
**File:** `src/services/sync/sync-reconciliation.ts` line 16
**Impact:** Remote deletes are applied unconditionally even if the entity has pending local changes. User's unsynced edits are destroyed silently.
**Fix:** Check `hasPendingChanges` for deletes too, or at minimum queue a conflict instead of deleting.

---

## High Priority (Warning)

### [W1] Three CRUD operations missing sync queue instrumentation
**File:** `src/stores/collections-store.ts` lines 137-152
**Impact:** `duplicateRequest`, `moveRequestToFolder`, `moveRequestToCollection` do not call `queueSyncChange`. These mutations will never sync to the server.
**Fix:** Add `queueSyncChange` calls for all three operations.

### [W2] `_abort` flag doesn't actually cancel the HTTP request
**File:** `src/stores/sync-store.ts` lines 174, 178, 193
**Impact:** `cancelSync()` sets a flag but `syncAll` / `pullChanges` / `pushChanges` are all `await`-based. The abort flag is only checked AFTER the full sync completes. Sync is not actually cancellable.
**Fix:** Pass an `AbortController.signal` to the HTTP client calls and abort that on cancel.

### [W3] `updateLocalVersion` scans all 4 tables sequentially
**File:** `src/services/sync/entity-sync-service.ts` lines 124-133
**Impact:** After each pushed entity, 4 DB queries run sequentially to find which table the entity belongs to. With N pushed entities, worst case is 4N queries.
**Fix:** The push response already knows the entity type from the pending change. Pass `entity_type` to `updateLocalVersion` and query only the correct table.

### [W4] `version` field is optional (`number | undefined`) on all models
**File:** `src/types/models.ts`
**Impact:** Sync logic assumes `version` exists (e.g., `existing.version` cast in reconciliation line 38). Optional field + type cast = potential `undefined` comparison bugs.
**Mitigation:** The DB migration sets default `version: 1`, so runtime risk is low. But type safety is weak. Consider making `version` required with default 1.

### [W5] `folders` and `requests` tables not re-indexed for `version` or `workspace_id`
**File:** `src/db/database.ts` v3 migration (line 38)
**Impact:** Only `collections` and `environments` get new indexes. `folders` and `requests` get `version` via upgrade but no index. `updateLocalVersion` does `table.get(entityId)` which uses primary key so this is OK, but future queries filtering by `workspace_id` on folders/requests will be unindexed full scans.
**Fix:** Add `workspace_id` index to folders/requests in v3 schema if workspace-scoped queries are planned.

---

## Medium Priority (Info)

### [I1] Duplicate `SyncPushPayload` / `SyncPushResponse` types
**Files:** `src/types/entity-sync.ts` and `src/types/cloud-sync.ts`
Both files define `SyncPushPayload` and `SyncPushResponse` with different shapes. The legacy types in `cloud-sync.ts` (lines 37-46) should be removed or clearly deprecated to avoid import confusion.

### [I2] `workspaceId` filter uses `equals(workspaceId as string)` — null handling
**File:** `src/services/sync/offline-change-queue.ts` line 37
If `workspaceId` is explicitly `null`, `equals(null as string)` is passed to Dexie. Dexie does support `equals(null)` for indexed fields, but the `as string` cast is misleading. Consider handling `null` explicitly.

### [I3] `sync-store.ts` at 208 lines — slightly over 200-line limit
Minor, but per project rules files should stay under 200 lines. Could extract auth methods into a separate module.

### [I4] `queueSyncChange` in collections-store always passes `version: 1` default
**File:** `src/stores/collections-store.ts` lines 114, 119, 124, 129, 134, 143
For update/delete operations, the `base_version` should be the entity's current version, not always 1. This breaks optimistic concurrency if the server validates base versions.

---

## Positive Observations

- Clean module separation: sync-service / reconciliation / queue are well-isolated
- All sync operations are non-blocking — `void queueSyncChange(...)` pattern prevents UI hangs
- DB migration is safe — sets defaults without dropping data, uses `modify()` correctly
- Type definitions are clear and complete for the sync protocol
- Error handling is consistent — catch + collect errors pattern in pull/push

---

## Recommended Actions (Priority Order)

1. **[C1]** Use `server_time` for `lastSyncAt` instead of local clock
2. **[C2]** Protect local pending changes from remote deletes
3. **[W1]** Add sync queue calls to `duplicateRequest`, `moveRequestToFolder`, `moveRequestToCollection`
4. **[W3]** Pass `entity_type` to `updateLocalVersion` to avoid 4-table scan
5. **[I1]** Remove or deprecate legacy sync types in `cloud-sync.ts`
6. **[I4]** Pass actual entity version as `base_version` in update/delete queue calls

## Metrics

| Metric | Value |
|--------|-------|
| Files | 8 |
| LOC | 859 |
| File size compliance | 7/8 (sync-store.ts slightly over) |
| Critical issues | 2 |
| Warnings | 5 |
| Info | 4 |

## Unresolved Questions

1. Is the server expected to validate `base_version` for optimistic concurrency? If yes, [I4] escalates to warning.
2. Will workspace-scoped queries on `folders`/`requests` tables be needed? If yes, [W5] needs indexes now.
3. Legacy 4-endpoint sync in `cloud-sync.ts` — is it still used? If not, dead code should be removed.
