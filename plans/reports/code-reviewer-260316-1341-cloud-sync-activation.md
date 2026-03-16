# Code Review: Cloud Sync Phase 2 Activation

**Date:** 2026-03-16
**Reviewer:** code-reviewer agent
**Scope:** request-store.ts, environment-store.ts, sync-store.ts, feature-flags.ts

---

## Overall Assessment

Solid implementation. The sync wiring follows a consistent non-blocking pattern across all three stores. The auto-sync listeners in sync-store are well-structured with proper cleanup on logout. A few issues found, mostly medium priority.

---

## Critical Issues

None.

---

## High Priority

### H1. `saveRequest()` sends entire snapshot as changes — data bloat + possible secret leakage

**File:** `src/stores/request-store.ts:296`
```ts
void queueSyncChange(snapshot.id, 'update', { ...snapshot } as Record<string, unknown>);
```

The `snapshot` is a full `ApiRequest` object including `body`, `auth` (which may contain tokens/passwords), `pre_script`, `post_script`, all headers, etc. This is:
1. **Wasteful** — every field is sent even when only one changed (e.g., renaming sends entire body)
2. **Security concern** — auth credentials in request body/headers are stored in `pending_changes` table as plaintext JSON, then pushed to server

**Compare with collections-store** which sends only the changed fields: `{ name }`, `{ workspace_id }`.

**Fix:** Track actual changed fields or at minimum send the same subset as `saveDraftToCollection` does. At minimum strip `auth` credentials from the changes payload.

### H2. `saveRequest()` does not pass `version` — always defaults to 1

**File:** `src/stores/request-store.ts:296`
```ts
void queueSyncChange(snapshot.id, 'update', { ...snapshot } as Record<string, unknown>);
// version parameter omitted — defaults to 1
```

The `create` calls correctly pass `request.version ?? 1`, but `saveRequest` (update path) omits version entirely. This means conflict detection on the server will always see `base_version: 1`, defeating LWW conflict resolution after the first sync round-trip.

**Fix:**
```ts
void queueSyncChange(snapshot.id, 'update', changedFields, snapshot.version ?? 1);
```

### H3. Missing `workspaceId` propagation in request-store and environment-store

**File:** `src/stores/request-store.ts` (lines 13-24) and `src/stores/environment-store.ts` (lines 13-24)

Both stores' `queueSyncChange` helpers have 4 parameters — no `workspaceId`. The `addPendingChange` function accepts an optional 6th arg `workspaceId` which defaults to `null`.

Collections-store correctly passes `result.workspace_id ?? null`. Request and environment stores always push `null`, meaning:
- Workspace-filtered `getPendingChanges(workspaceId)` will never find these changes
- `pushChanges` with a workspace filter will skip them

**Impact:** If workspace-scoped sync is used, requests and environments won't sync.

**Fix:** Pass `workspaceId` through from the entity or its parent collection.

---

## Medium Priority

### M1. Two code paths create requests without sync wiring

**history-store.ts:125** — `saveToCollection()` calls `requestService.create()` but does NOT queue a sync change. Requests saved from history will remain local-only.

**import-export-service.ts:126** — `requestService.create()` called during cURL import without sync queueing. Imported requests won't sync.

Both are legitimate mutations that create real persisted requests. They should queue sync changes.

### M2. `queueSyncChange` helper duplicated across 3 stores (DRY violation)

`request-store.ts`, `environment-store.ts`, and `collections-store.ts` each define their own `queueSyncChange` wrapper with nearly identical logic. Only difference: collections-store accepts `entityType` + `workspaceId` params.

**Fix:** Extract to a shared utility in `services/sync/` or extend the one in `offline-change-queue.ts`:
```ts
export async function queueSyncChangeSafe(...args: Parameters<typeof addPendingChange>): Promise<void> {
  try { await addPendingChange(...args); } catch { /* non-blocking */ }
}
```

### M3. Online handler debounce uses `setTimeout` without cancellation tracking

**File:** `src/stores/sync-store.ts:134`
```ts
setTimeout(() => get().syncAll(), AUTO_SYNC_DEBOUNCE_MS)
```

If the user goes online/offline/online rapidly, multiple `syncAll` calls will fire after their respective 2s delays. The `status !== 'syncing'` guard at check time helps, but the `setTimeout` reference is lost — logout cleanup cannot cancel pending timeouts.

**Fix:** Store the timeout ID and clear it on logout:
```ts
let onlineDebounceTimer: ReturnType<typeof setTimeout> | null = null;
// In handler:
if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
onlineDebounceTimer = setTimeout(() => get().syncAll(), AUTO_SYNC_DEBOUNCE_MS);
// In logout:
if (onlineDebounceTimer) { clearTimeout(onlineDebounceTimer); onlineDebounceTimer = null; }
```

### M4. Periodic sync interval not gated on `navigator.onLine` initially

The interval fires every 5min and checks `navigator.onLine` inside (good), but continues ticking even when auth state hasn't been confirmed yet. On cold start, `loadConfig` sets up the interval before `onAuthChanged` fires, so early ticks will hit `cfg.enabled` check on the default config (`enabled: false`). This is benign but wasteful.

### M5. `setActiveEnvironment` not wired to sync

`setActiveEnvironment()` modifies `is_active` on environments in the DB but does not queue a sync change. If `is_active` is synced server-side, this is a gap. If `is_active` is intentionally local-only (documented as such), this is fine.

---

## Low Priority

### L1. Feature flag is a compile-time constant

`FEATURES.CLOUD_SYNC` is `as const` — no runtime toggle. To disable sync without redeployment, would need a build. Consider reading from settings/IndexedDB for runtime control.

### L2. Empty catch blocks should log in dev mode

All `queueSyncChange` wrappers silently swallow errors. In development, this makes debugging sync issues harder. Consider `console.debug` in dev mode.

---

## Edge Cases Found by Scouting

1. **History save-to-collection** — creates request via `requestService.create()` without sync queue (M1)
2. **cURL import** — same gap (M1)
3. **Rapid online/offline toggling** — multiple debounced `syncAll` fire without cancellation (M3)
4. **Workspace-scoped sync filtering** — requests and environments always have `workspace_id: null` in pending_changes, invisible to workspace-filtered queries (H3)
5. **Version drift** — `saveRequest` always sends `base_version: 1` regardless of actual version (H2)

---

## Positive Observations

- Consistent non-blocking `void queueSyncChange(...)` pattern across all stores — UI never blocks on sync failures
- Auto-sync listeners properly cleaned up on logout (online handler, periodic interval, WS, auth)
- Draft operations correctly excluded from sync (local-only until explicit save)
- Global variables correctly excluded from sync (stored in settings, not entity table)
- Feature flag gating on auto-sync is clean

---

## Recommended Actions (Priority Order)

1. **[H2]** Pass `snapshot.version ?? 1` to `queueSyncChange` in `saveRequest()`
2. **[H1]** Narrow `saveRequest` changes payload to actual changed fields, or at minimum exclude auth/body when unchanged
3. **[H3]** Propagate `workspaceId` through request-store and environment-store sync helpers
4. **[M1]** Wire sync for history-store `saveToCollection` and import-export-service `importCurl`
5. **[M3]** Track and cancel the online-debounce timeout on logout
6. **[M2]** Extract shared `queueSyncChangeSafe` helper (DRY)

---

## Metrics

- **Files reviewed:** 4 changed + 4 scouted (collections-store, offline-change-queue, entity-sync-service, history-store, import-export-service)
- **Type safety:** Good — `as Record<string, unknown>` cast on line 296 is the only loose typing
- **Linting issues:** 0 (consistent style)

---

## Unresolved Questions

1. Is `is_active` on environments intended to sync or remain local-only? (affects M5 classification)
2. Should imported data (cURL, Postman, OpenAPI) trigger sync immediately or wait for next periodic/manual sync?
3. Is workspace-scoped sync currently used, or is everything personal (null workspace)? If only null workspace, H3 is deferred.
