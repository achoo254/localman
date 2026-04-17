# Phase 01 — Branch + Audit Imports

**Status:** completed
**Priority:** P0
**Effort:** XS (~30min)

## Overview
Tạo branch và build danh sách file/symbol chính xác cần xóa để các phase sau làm cleanly. Không xóa gì ở phase này — chỉ recon.

## Key Insights
- 3 plan cũ liên quan sync (`260313-1021`, `260313-1351`, `260316-1322`) đã `completed` → an toàn xóa code sync
- Files cần grep imports: `sync-store`, `conflict-store`, `presence-store`, `workspace-store`, `services/sync`, `auth-handler`, `@tauri-apps`

## Steps

1. `git checkout -b feat/web-only-simplification`
2. Grep references để build delete-list:
   ```bash
   # Sync stores
   grep -r "from ['\"].*stores/sync-store" src/
   grep -r "from ['\"].*stores/conflict-store" src/
   grep -r "from ['\"].*stores/presence-store" src/
   grep -r "from ['\"].*stores/workspace-store" src/
   # Sync services
   grep -r "from ['\"].*services/sync" src/
   grep -r "from ['\"].*services/auth-handler" src/
   # Tauri
   grep -r "@tauri-apps" src/ vite.config.ts package.json
   # BE references from FE
   grep -r "sync\|presence\|workspace\|conflict" src/components/ src/stores/
   ```
3. Save grep output → `plans/dattqh/260417-1334-web-only-simplification/audit-results.txt`
4. List Tauri-only deps trong `package.json` (`@tauri-apps/*`, `@tauri-apps/cli`, etc.)
5. List BE deps cần xóa: `drizzle-orm`, `pg`, `firebase-admin` (sẽ thêm lại phase 4), `ws`, `firebase`, etc.

## Todo
- [ ] Create branch `feat/web-only-simplification`
- [ ] Grep all sync/Tauri imports → save audit-results.txt
- [ ] List Tauri deps to remove from package.json
- [ ] List BE deps to remove from backend/package.json
- [ ] Identify components consuming sync/workspace stores (update list)

## Success Criteria
- Branch created and checked out
- `audit-results.txt` exists with all import references
- Clear list of deps to remove documented

## Risks
- Hidden dynamic imports (string concatenation) → mitigate with broader grep
- Re-exports through barrel files → check `index.ts` exports

## Next
Phase 02 sử dụng audit-results.txt để xóa chính xác file FE.
