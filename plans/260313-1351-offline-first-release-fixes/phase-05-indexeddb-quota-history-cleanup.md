---
phase: 05
title: IndexedDB Quota Handling + History Cleanup
priority: medium
status: completed
effort: low-medium
completed: 2026-03-13
---

# Phase 05: IndexedDB Quota Handling + History Auto-Cleanup

## Context
- No quota error handling anywhere in codebase
- DB service functions throw uncaught on quota exceeded
- History logs every request execution (fire-and-forget, errors silently ignored)
- History can grow unbounded

## Overview

Catch `QuotaExceededError` globally, show toast warning. Add optional history auto-cleanup setting.

## Related Code Files

**Modify:**
- `src/db/database.ts` — add global Dexie error handler
- `src/utils/db-error-handler.ts` (created in Phase 01) — add quota-specific handling
- `src/stores/history-store.ts` — add cleanup function
- `src/stores/settings-store.ts` — add history retention setting
- `src/components/settings/general-settings.tsx` — add retention dropdown

**Create:**
- Nothing new if `db-error-handler.ts` already created in Phase 01

## Implementation Steps

### Part A: Quota Error Handling

1. **Global Dexie error handler in database.ts:**
   ```ts
   db.on('populate', () => { /* initial seed if needed */ });

   // Global handler for uncaught DB errors
   window.addEventListener('unhandledrejection', (event) => {
     if (event.reason?.name === 'QuotaExceededError' ||
         event.reason?.inner?.name === 'QuotaExceededError') {
       event.preventDefault();
       handleDbError(event.reason, 'storage-quota');
     }
   });
   ```

2. **Enhance db-error-handler.ts (from Phase 01):**
   ```ts
   export function handleDbError(error: unknown, context: string): void {
     if (isQuotaError(error)) {
       toast('Storage almost full', {
         description: 'Clear request history in Settings to free space.',
         variant: 'error'
       });
       return;
     }
     toast(`Database error: ${context}`, { variant: 'error' });
   }

   function isQuotaError(error: unknown): boolean {
     if (error instanceof DOMException && error.name === 'QuotaExceededError') return true;
     if (error && typeof error === 'object' && 'inner' in error) {
       return isQuotaError((error as any).inner);
     }
     return false;
   }
   ```

3. **Rate-limit toast:** Show quota warning max once per 60s (prevent spam)

### Part B: History Auto-Cleanup (Nice-to-Have)

1. **Add setting:** `HISTORY_RETENTION_DAYS` in settings types
   - Options: 7, 30, 90, 0 (never/keep all)
   - Default: 0 (disabled — opt-in)

2. **Add cleanup function in history-store:**
   ```ts
   async cleanupOldHistory(retentionDays: number) {
     if (retentionDays <= 0) return;
     const cutoff = new Date();
     cutoff.setDate(cutoff.getDate() - retentionDays);
     await db.history.where('created_at').below(cutoff.toISOString()).delete();
   }
   ```

3. **Run on app startup:** If retention setting > 0, cleanup old entries

4. **Add UI in general-settings.tsx:**
   - Dropdown: "Keep history for: Forever / 7 days / 30 days / 90 days"
   - "Clear all history" button with confirmation

### Part C: DB Health Check (Nice-to-Have)

1. **On startup in database.ts:**
   ```ts
   export async function checkDbHealth(): Promise<boolean> {
     try {
       await db.settings.count(); // Quick read test
       return true;
     } catch {
       return false;
     }
   }
   ```

2. If health check fails: show toast "Database may be corrupted. Export your data and reset if issues persist."

## Todo List

- [x] Add global `unhandledrejection` listener for QuotaExceededError
- [x] Enhance db-error-handler with quota-specific message
- [x] Add rate-limiting for quota toast (max 1 per 60s)
- [x] Add `HISTORY_RETENTION_DAYS` setting (type, store, default)
- [x] Add `cleanupOldHistory()` in history-store
- [x] Run cleanup on app startup if setting > 0
- [x] Add retention dropdown in general-settings UI
- [x] Add "Clear all history" button with confirm dialog
- [x] Add `checkDbHealth()` function
- [x] Call health check on app startup
- [x] Test: fill history → set retention to 7 days → verify cleanup
- [x] Test: simulate quota error → verify toast appears

## Success Criteria

- QuotaExceededError shows user-friendly toast (not silent failure)
- Toast not spammed (max 1 per 60s)
- History cleanup works with configurable retention
- "Clear all history" button works with confirmation
- DB health check runs silently on startup, warns only if issue detected
