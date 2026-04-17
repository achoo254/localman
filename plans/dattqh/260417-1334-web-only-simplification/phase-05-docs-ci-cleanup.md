# Phase 05 — Docs + CI Cleanup

**Status:** completed
**Priority:** P1
**Effort:** S (~1h)
**Depends on:** Phase 04

## Overview
Update tài liệu và GitLab CI phản ánh kiến trúc mới. Bỏ Windows Tauri build, giữ lint + test.

## Files to Modify

### `CLAUDE.md`
- Project Overview: cập nhật từ "Tauri + React + TypeScript" → "Web SPA + Node Fastify proxy"
- Tech Stack section: bỏ Tauri/Rust, bỏ Cloud sync Phase 2, thêm Firebase Auth, thêm BE Fastify
- Layout/Architecture: cập nhật reflect web-only
- Phase status: chuyển sang "Phase 1 web-only complete (post-simplification)"
- Bỏ section "Agent Execution Protocol" reference cũ nếu liên quan Tauri build
- Bỏ command `pnpm tauri dev/build`
- Add: `pnpm dev:all` (FE + BE concurrent)

### `README.md`
- Tagline: cập nhật bỏ "lives on your machine" desktop framing nếu cần
- Setup instructions: web + BE proxy
- Firebase setup steps (env vars, sign-in provider)

### `docs/`
- `system-architecture.md` — rewrite cho 2-tier (Web + Proxy)
- `deployment-guide.md` — rewrite (FE static + BE Docker)
- `code-standards.md` — bỏ refs Rust/Tauri
- `codebase-summary.md` — refresh dirs
- `cross-platform-testing.md` — xóa hoặc rewrite (web only, browser compat)
- `gitlab-workflow-guide.md` — update CI section

### `requirement.md`
- **Không đụng** (per owner decision)

### `.gitlab-ci.yml`
- Remove job: Windows tag `v*` Tauri build
- Remove all Rust/Cargo steps
- Keep: `lint-and-test` (node:22-alpine)
- Verify: trigger only on push, no nightly Tauri jobs

### Other
- `pnpm-workspace.yaml` — verify `backend/*` still listed; xóa nếu chỉ workspace cũ liên quan packages đã xóa
- `.gitignore` — đảm bảo `.env`, Tauri artifacts (`src-tauri/target/`), và defensive `*firebase-adminsdk*.json` đã xử lý <!-- Updated: Validation S1 #4 -->
- **Delete completed sync plan dirs (Validation S1 #7):**
  - `plans/260313-1021-*`
  - `plans/260313-1351-*`
  - `plans/260316-1322-*`
  - Grep `plans/` for any other sync/cloud-related completed dirs and remove

## Steps

1. Rewrite `CLAUDE.md` (giữ <300 lines)
2. Rewrite `README.md`
3. Refresh `docs/*` files (system-architecture, deployment-guide, code-standards, codebase-summary)
4. Delete `docs/cross-platform-testing.md` (web-only không cần)
5. Edit `.gitlab-ci.yml` — strip Windows + Rust jobs
6. Push branch → verify GitLab CI green (lint + test only)
7. Verify `pnpm dev:all` works fresh clone (READMEsteps)
8. Open PR/MR with brainstorm + plan link

## Todo
- [ ] Rewrite CLAUDE.md
- [ ] Rewrite README.md (note: existing local data wiped on first run after merge — Validation S1 #3)
- [ ] Update docs/system-architecture.md
- [ ] Update docs/deployment-guide.md (REQUIRE_AUTH + FIREBASE_SERVICE_ACCOUNT_JSON env)
- [ ] Update docs/code-standards.md
- [ ] Update docs/codebase-summary.md
- [ ] Delete docs/cross-platform-testing.md
- [ ] Delete completed sync plan dirs (260313-1021, 260313-1351, 260316-1322) <!-- Updated: Validation S1 #7 -->
- [ ] Strip .gitlab-ci.yml of Windows/Rust jobs
- [ ] Verify CI pipeline green
- [ ] Open MR linking plan + brainstorm

## Success Criteria
- No mentions of Tauri/Rust/Cargo/Windows build in docs (except history/changelog)
- GitLab CI runs only lint + test, completes < 5min
- Fresh clone → follow README → app runs end-to-end

## Risks
- Stale doc references in scattered files → grep `tauri\|cargo\|src-tauri` across `docs/` + root
- CI cache may hold Rust toolchain → clear if needed
- MR reviewers expecting old desktop flow → link brainstorm in MR description

## Next
Plan complete. Run `/ck:plan archive` after merge to journal + move to archive.
