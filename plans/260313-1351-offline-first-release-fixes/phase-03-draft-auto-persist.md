---
phase: 03
title: Draft Auto-Persist to IndexedDB
priority: critical
status: completed
effort: medium
completed: 2026-03-13
---

# Phase 03: Draft Auto-Persist to IndexedDB

## Context
- Drafts currently: in-memory `drafts: Record<string, ApiRequest>` in request-store (line 50)
- ID pattern: `draft_${crypto.randomUUID()}` (line 139)
- Auto-save hook explicitly skips drafts: `if (!isDirty || isDraft) return` (use-auto-save.ts line 20)
- Close app = drafts lost

## Overview

Persist drafts to IndexedDB so they survive app restart. Use Dexie schema v4 migration to add `drafts` table. Restore on app init.

## Key Insights

- Drafts already have unique IDs (`draft_*`) — can use as DB keys
- `updateActiveRequest()` already updates drafts map (lines 127-130) — hook persistence here
- Don't over-engineer: just persist the full `ApiRequest` object, no delta tracking

## Related Code Files

**Modify:**
- `src/db/database.ts` — add `drafts` table in v4 schema upgrade
- `src/stores/request-store.ts` — persist drafts to DB on change, restore on init
- `src/hooks/use-auto-save.ts` — remove `isDraft` skip, or create separate draft-save logic

**Create:**
- `src/db/services/draft-service.ts` — CRUD for drafts table

## Architecture

```
User edits draft → request-store updates drafts map → debounced 3s → save to IndexedDB
App starts → load drafts from IndexedDB → populate drafts map + open tabs
Tab closed → remove from IndexedDB
```

## Implementation Steps

1. **Add drafts table to Dexie (v4):**
   ```ts
   // database.ts
   this.version(4).stores({
     // ... existing tables unchanged
     drafts: 'id' // simple key-value, stores full ApiRequest
   });
   ```

2. **Create draft-service.ts:**
   ```ts
   export const draftService = {
     getAll: () => db.drafts.toArray(),
     save: (draft: ApiRequest) => db.drafts.put(draft),
     remove: (id: string) => db.drafts.delete(id),
     clear: () => db.drafts.clear(),
   };
   ```

3. **Modify request-store.ts:**
   - Add `restoreDrafts()` action: called on app init, loads from DB, populates `drafts` map + `openTabs`
   - In `updateActiveRequest()`: after updating drafts map, debounce-save to DB (3s)
   - In `closeTab()`: if draft, call `draftService.remove(tabId)`
   - In `saveRequest()` (when draft becomes real): call `draftService.remove(draftId)` after saving to requests table

4. **Debounce strategy:**
   - Use per-draft debounce (not global) to avoid losing rapid edits on different drafts
   - 3s interval — balances responsiveness vs DB writes
   - On app close (Tauri `beforeunload`): flush all pending draft saves immediately

5. **Restore on startup:**
   - In app-layout.tsx init or request-store init, call `restoreDrafts()`
   - Restored drafts appear as tabs (same as if user just created them)

6. **Cleanup orphan drafts:**
   - On startup, remove drafts older than 30 days (optional safety)

## Todo List

- [x] Add `drafts` table to Dexie v4 schema in database.ts
- [x] Create `src/db/services/draft-service.ts`
- [x] Add `restoreDrafts()` action to request-store
- [x] Add debounced draft persistence in `updateActiveRequest()`
- [x] Remove draft from DB in `closeTab()` when closing draft
- [x] Remove draft from DB in `saveRequest()` when saving draft as real request
- [x] Add `beforeunload` handler to flush pending draft saves
- [x] Call `restoreDrafts()` on app init
- [x] Test: create draft → close app → reopen → draft restored
- [x] Test: save draft as real request → draft removed from drafts table
- [x] Verify no regression in existing auto-save for non-draft requests

## Risk Assessment

- **DB bloat**: Unlikely — drafts are small JSON objects, auto-cleaned on close/save
- **Race condition**: Per-draft debounce prevents conflicts between different draft saves
- **Migration**: v4 schema adds table only, no data migration needed

## Success Criteria

- Unsaved drafts survive app restart
- Closing a draft tab removes it from DB
- Saving a draft as real request cleans up draft entry
- No performance degradation on app startup (drafts loaded in parallel)
