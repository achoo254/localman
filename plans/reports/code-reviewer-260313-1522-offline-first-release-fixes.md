# Code Review: Offline-First Release Fixes (5 Phases)

**Date:** 2026-03-13
**Reviewer:** code-reviewer
**Scope:** 13 files across 5 phases (error boundaries, timeout, drafts, feature flags, quota/history)
**Status:** Type-check passes, 35 tests pass, 0 lint errors

## Overall Assessment

Solid implementation. Phases are well-scoped, code is clean, and the offline-first patterns are correctly applied. A few race conditions and edge cases worth addressing before release.

---

## Critical Issues

None found.

---

## High Priority

### H1. Timeout not cleared on user cancel (response-store.ts:166-169)

When user calls `cancelRequest()`, the abort fires but `clearTimeout(timeoutId)` is never called -- the timeout timer lives in the `executeRequest` closure. If user cancels at t=1s and timeout is 30s, the `setTimeout` callback fires 29s later calling `controller.abort('timeout')` on an already-aborted controller. Harmless in practice (double-abort is a no-op), but wastes a dangling timer per cancellation.

**Fix:** Store `timeoutId` in the store state (or a ref alongside `abortController`) and clear it in `cancelRequest()`.

### H2. `beforeunload` flush is fire-and-forget async (request-store.ts:336-340)

`flushAllDraftSaves` calls `draftService.save()` (async IndexedDB write) inside `beforeunload`. Browsers don't wait for async operations in `beforeunload` -- the page may unload before writes complete.

**Recommendation:** Use `navigator.sendBeacon` for a synchronous signal, or switch to `Dexie`'s synchronous transaction mode. Alternatively, since the debounce is only 3s, the risk window is small -- document as known limitation for now and consider using `visibilitychange` (which fires earlier and allows async work in most browsers).

### H3. `clearTimeout` placed after await chain, not in finally (response-store.ts:115)

If `runPostScript` throws a non-AbortError, `clearTimeout(timeoutId)` at line 115 is skipped and only hit in the catch block at line 146. This is actually handled correctly because catch also calls `clearTimeout` -- but the timeout still fires after the error, calling abort on a null controller. The pattern works but is fragile.

**Recommendation:** Move `clearTimeout(timeoutId)` into a `finally` block for robustness.

---

## Medium Priority

### M1. `saveRequest` dirty-flag check uses `updated_at` comparison (request-store.ts:280)

```ts
if (get().activeRequest?.updated_at === snapshot.updated_at) {
```

This compares `updated_at` but `updateActiveRequest` never sets `updated_at` -- it only spreads partial fields. So `updated_at` stays the same from the last DB load, meaning this guard never catches concurrent edits. The dirty flag always gets cleared.

**Impact:** Minor -- worst case, dirty indicator flickers. But the guard gives false safety. Either update `updated_at` on each edit or use a simple counter/revision number.

### M2. `cleanupOldHistory` has no error handling (history-store.ts:100-107)

`clearOlderThan` can throw (DB error), but `cleanupOldHistory` has no try-catch. Since it's called on startup from `app-layout.tsx`, an uncaught rejection would surface in console but not crash the app (it's `void`-ed). Still, inconsistent with the rest of the codebase that wraps DB calls.

### M3. Quota global handler duplicates `isQuotaError` logic (database.ts:76-92)

The `unhandledrejection` handler reimplements the QuotaExceededError check instead of importing `isQuotaError` from `db-error-handler.ts`. The lazy import is done to avoid circular deps, which is fine -- but the inline check is slightly different (checks `.inner?.name` as string vs the recursive approach in `isQuotaError`). Could diverge over time.

### M4. No input validation on `requestTimeoutMs` beyond HTML min/max (general-settings.tsx:67-74)

HTML `min=1000 max=300000` only constrains UI. A user editing IndexedDB directly or an import could set `requestTimeoutMs` to 0 or negative, causing `setTimeout(() => ..., 0)` -- immediate abort. Add a runtime clamp in `response-store.ts` before `setTimeout`.

### M5. `historyRetentionDays` of 0 means "forever" but dropdown allows custom via import (settings.ts:35)

`cleanupOldHistory` guards `if (retentionDays <= 0) return 0` -- correct. But if someone sets a negative value via DB manipulation, the `cutoff.setDate(cutoff.getDate() - retentionDays)` would compute a *future* date, deleting ALL history. Add `Math.max(0, retentionDays)` or validate on load.

---

## Low Priority

### L1. Error boundary retry may loop if error is deterministic

`handleRetry` clears error state and re-renders children. If the error is deterministic (e.g., a component always throws), the boundary catches it again immediately, creating a render loop. Consider adding a retry counter with max attempts.

### L2. `draftSaveTimers` is a module-level Map, not cleaned on HMR

During Vite HMR, the module re-executes but old timers from the previous module instance are orphaned. Minor dev-only issue.

### L3. Feature flags are compile-time constants

`FEATURES.CLOUD_SYNC = false` is a static const. Tree-shaking will remove guarded code in production builds, which is good. But toggling requires rebuild. Consider making it runtime-configurable via settings for testing.

---

## Edge Cases Found by Scout

1. **Draft restore + tab ordering:** `restoreDrafts` appends tabs but doesn't preserve original tab order. If user had [Request A, Draft B, Request C], after restart it becomes [Draft B] with no memory of position. Acceptable for MVP.

2. **Concurrent `restoreDrafts` calls:** `restoreDrafts` has no guard against double-invocation. If `useEffect` fires twice (React StrictMode), tabs could be duplicated. The `useEffect` deps array prevents this in production, but StrictMode in dev would double-call.

3. **`saveDraftToCollection` race with `updateActiveRequest`:** If user edits draft while `saveDraftToCollection` is mid-flight, the edit goes to `drafts[tabId]` which gets deleted by the save completion. The edit is lost. Low probability but possible.

4. **`clearOlderThan` uses string comparison on ISO dates:** Works correctly for ISO 8601 format (lexicographic order matches chronological), but only if all timestamps use the same timezone format (UTC `Z` suffix). Mixed formats would cause incorrect deletions.

---

## Positive Observations

- Error boundary split into full/panel variants is well-designed; `resetKey` prop for automatic recovery is elegant
- Debounced draft persistence with per-draft timers avoids thundering herd writes
- `_loadingRequestId` pattern for discarding stale async loads is a clean race-condition fix
- Feature flag approach is simple and effective for Phase 1 gating
- Quota toast rate-limiting (60s cooldown) prevents notification spam
- DB health check on startup is a good defensive measure
- History retention UI with confirmation dialog for "clear all" is user-friendly

---

## Recommended Actions (Prioritized)

1. **[H1]** Clear timeout on manual cancel -- store `timeoutId` alongside `abortController`
2. **[H2]** Document `beforeunload` limitation or switch to `visibilitychange` for draft flush
3. **[M4]** Add runtime clamp for `requestTimeoutMs` (e.g., `Math.max(1000, timeoutMs)`)
4. **[M5]** Add `Math.max(0, retentionDays)` guard in `cleanupOldHistory`
5. **[M1]** Fix `updated_at` comparison or replace with revision counter
6. **[M2]** Add try-catch to `cleanupOldHistory`
7. **[M3]** Deduplicate quota error detection logic

---

## Metrics

- **Type Coverage:** Full (tsc --noEmit passes)
- **Test Coverage:** 35 tests passing
- **Lint Issues:** 0 errors
- **Files Changed:** 13 across 5 phases

## Unresolved Questions

1. Is `visibilitychange` event available in Tauri WebView, or only standard `beforeunload`? This affects H2 recommendation.
2. Should draft restore deduplicate against already-open tabs (relevant for StrictMode double-mount)?
