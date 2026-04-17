# Phase 02 — Strip FE Sync Code

**Status:** completed
**Priority:** P0
**Effort:** M (~2-3h)
**Depends on:** Phase 01 (audit-results.txt)

## Overview
Xóa toàn bộ code cloud sync khỏi frontend. Components dùng sync-related stores phải refactor để chỉ dùng local IndexedDB stores.

## Files to Delete

```
src/services/sync/                        (toàn bộ)
src/services/auth-handler.ts
src/services/auth-handler.test.ts
src/stores/sync-store.ts
src/stores/sync-store.reconnect.test.ts
src/stores/conflict-store.ts
src/stores/presence-store.ts
src/stores/workspace-store.ts
src/stores/environment-store.sync.test.ts
src/stores/request-store.sync.test.ts
```

## Files to Modify
- `src/stores/environment-store.ts` — remove sync hook calls
- `src/stores/request-store.ts` — remove sync hook calls
- `src/stores/collections-store.ts` — remove sync hook calls (~12 sync ops per old plan)
- `src/stores/history-store.ts` — remove sync hook calls
- `src/stores/settings-store.ts` — remove encrypted refresh-token field
- `src/db/` — remove `pending_sync` / `pending_changes` table from Dexie schema, bump version
- Components in `src/components/` referencing workspace/conflict/presence — strip UI

## Steps

1. Read `audit-results.txt` from Phase 01
2. Delete files listed above
3. For each store file in modify list:
   - Remove `import` of sync services
   - Remove `enqueue*` / `pushChange` calls
   - Keep only IndexedDB write logic
4. Dexie schema + boot-time wipe (Validation S1 #3):
   - Remove `pending_changes` / `pending_sync` table definition entirely
   - Bump version number
   - **Boot-time wipe:** in app entry (`src/main.tsx` or equivalent), before Dexie open:
     ```ts
     const RESET_FLAG = 'localman.schemaResetV2';
     if (!localStorage.getItem(RESET_FLAG)) {
       await Dexie.delete('localman'); // or actual DB name
       localStorage.setItem(RESET_FLAG, '1');
     }
     ```
   - Document in CHANGELOG / Phase 05 docs that existing local data is wiped on first run after merge.
5. Strip UI components: workspace switcher dropdown, conflict resolution modal, presence indicators, sync status in titlebar/statusbar — replace with empty placeholder or remove entirely
6. Run `pnpm type-check` → fix all errors
7. Run `pnpm lint` → fix
8. Run `pnpm build` → must pass
9. Run `pnpm test` → fix non-sync tests; sync tests already deleted

## Todo
- [x] Delete sync stores + services + tests
- [x] Refactor `request-store.ts` to remove sync hooks
- [x] Refactor `environment-store.ts`
- [x] Refactor `collections-store.ts` (~12 ops)
- [x] Refactor `history-store.ts` (verified: no sync imports)
- [x] Update Dexie schema, drop `pending_changes` table (v5)
- [x] Add boot-time `Dexie.delete('localman')` guarded by `localman.schemaResetV2` flag
- [x] Strip workspace switcher / conflict modal / presence UI / sync status
- [x] `pnpm type-check` pass
- [x] `pnpm lint` pass
- [x] `pnpm build` pass
- [x] `pnpm test` pass

## Success Criteria
- No `import` of sync/workspace/conflict/presence anywhere in `src/`
- All listed deletions executed
- Build + lint + test pass

## Risks
- Components silently coupled to workspace context (e.g. via React context) → grep for `WorkspaceContext`/`useWorkspace`
- Test fixtures may seed sync data → update fixtures
- Dexie migration may corrupt local dev DB → users wipe IndexedDB or bump version triggers drop

## Next
Phase 03 strip Tauri (HTTP client rewrite, src-tauri/ removal).
