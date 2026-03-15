# Brainstorm: Offline-First Release Readiness

**Date:** 2026-03-13
**Scope:** Phase 1 only (no cloud sync), first public release
**Assessment:** ~70% complete, 5 must-fix items before release

---

## Problem Statement

Localman is an offline-first desktop API client. Before releasing Phase 1 (pure offline), need to verify all offline features work reliably and identify gaps.

## What Works Well (No Changes Needed)

- IndexedDB (Dexie.js) as source of truth — solid schema v3
- Auto-save requests with 300ms debounce
- HTTP execution via Tauri plugin (bypasses CORS)
- History auto-logging
- Pre/post scripts in QuickJS sandbox (serial queue, 5.5s timeout)
- Variable interpolation (`{{var}}` + `{{$dynamic}}`)
- Import/export (cURL, Postman v2.1, native JSON)
- Settings persistence (17 keys loaded in parallel)
- Atomic cascade deletes (collection → folders → requests)

## Evaluated Approaches

### Approach A: Fix everything including cloud sync prep
- Pros: Future-proof, less work later
- Cons: Over-engineering, YAGNI violation, delays release
- **Rejected**: Cloud sync is Phase 2, shouldn't block Phase 1

### Approach B: Fix only critical data integrity issues (3 items)
- Pros: Fastest release
- Cons: Poor UX (no timeout, no quota handling, cloud UI confusing)
- **Rejected**: First impressions matter for new product

### Approach C: Fix all Phase-1-relevant issues (5 must-fix + 2 nice-to-have)
- Pros: Clean first release, good UX, no cloud sync scope creep
- Cons: More work than minimum
- **Selected**: Best balance of quality and speed

## Final Recommended Solution

### Must-Fix (5 items)

#### 1. Draft Auto-Persist to IndexedDB
- **Problem**: Drafts (unsaved new requests) only in memory. Close app = lost.
- **Solution**: Auto-save drafts to IndexedDB every 2-3s. Restore on app startup. Mark with `is_draft: true` flag.
- **Files**: `src/stores/request-store.ts`, `src/db/database.ts`
- **Complexity**: Medium

#### 2. Granular Error Boundaries
- **Problem**: DB write failure → white screen crash. Single error boundary at root only shows "reload".
- **Solution**: Add error boundaries around sidebar, request panel, response panel. Catch DB errors → toast with retry button.
- **Files**: `src/components/common/error-boundary.tsx`, `src/components/layout/app-layout.tsx`, panel components
- **Complexity**: Low-Medium

#### 3. Request Timeout + Cancellation
- **Problem**: HTTP requests hang indefinitely if network drops mid-transfer. No user control.
- **Solution**: Default 30s timeout (user-configurable in Settings). AbortController integration. "Cancel" button in UI.
- **Files**: `src/services/http-client.ts`, `src/utils/tauri-http-client.ts`, `src/stores/settings-store.ts`
- **Complexity**: Medium

#### 4. IndexedDB Quota Handling
- **Problem**: `QuotaExceededError` not caught. All writes fail silently if quota exceeded.
- **Solution**: Catch quota errors globally. Toast warning "Storage almost full". Suggest clear old history. Show storage usage in Settings.
- **Files**: `src/db/database.ts` (global error handler), `src/components/settings/`
- **Complexity**: Low

#### 5. Cloud UI "Coming Soon" State
- **Problem**: Cloud features (Login, Sync, Workspace) visible but non-functional. Confusing for users.
- **Solution**: Disable buttons, add "Coming Soon" tooltips. Grey out sync status area. Keep UI elements visible so users know features are planned.
- **Files**: `src/components/settings/cloud-login-form.tsx`, `src/components/settings/sync-settings.tsx`, `src/components/layout/app-layout.tsx`
- **Complexity**: Low

### Nice-to-Have (2 items)

#### 6. History Auto-Cleanup
- Optional setting: auto-delete history older than X days (7/30/90/never)
- Reduces quota pressure for heavy users
- **Complexity**: Low

#### 7. DB Health Check on Startup
- Validate schema version matches expected
- If corrupted: offer "Reset database" with export-first option
- **Complexity**: Low

## Items Explicitly Out of Scope (Phase 2)

- Sync queue integration (`addPendingChange` in request store)
- Auto-sync on reconnect
- Conflict resolution persistence
- Online detection improvement
- WebSocket fallback to HTTP polling
- Pending changes counter UI
- Server-side 3-way merge

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Draft persist causes DB bloat | Low | Low | Cleanup orphan drafts on startup |
| Error boundary catches too aggressively | Medium | Medium | Only catch rendering errors, not logic |
| Timeout too aggressive for slow APIs | Medium | Low | User-configurable, generous default (30s) |
| Quota warning annoying | Low | Low | Show once per session, dismissable |

## Success Criteria

1. ✅ App starts and loads all data from IndexedDB without network
2. ✅ Drafts survive app restart
3. ✅ DB errors show toast, not white screen
4. ✅ HTTP requests timeout after configurable duration
5. ✅ Quota exceeded shows warning before data loss
6. ✅ Cloud features clearly marked "Coming Soon"
7. ✅ All existing tests pass
8. ✅ No regression in core CRUD operations

## Implementation Priority Order

1. Error Boundaries (foundation — prevents crashes during other work)
2. Request Timeout (high user impact, straightforward)
3. Draft Auto-Persist (data integrity)
4. Cloud UI "Coming Soon" (UX polish)
5. IndexedDB Quota Handling (safety net)
6. History Auto-Cleanup (nice-to-have)
7. DB Health Check (nice-to-have)

## Unresolved Questions

1. Draft auto-persist interval: 2s hay 3s? (suggest 3s — less DB writes)
2. Request timeout default: 30s hay 60s? (suggest 30s — matches Postman)
3. History auto-cleanup default: enabled hay disabled? (suggest disabled — opt-in)
4. Should "Coming Soon" show expected timeline? (suggest no — avoid broken promises)
