---
title: "Web-Only Simplification"
description: "Remove Tauri desktop + cloud sync BE. Keep web SPA offline-first + new Node Fastify stateless proxy with Firebase Google Auth verify."
status: completed
priority: P0
effort: medium
branch: feat/web-only-simplification
tags: [refactor, cleanup, backend, frontend, tauri-removal]
created: 2026-04-17
completed: 2026-04-17
slug: web-only-simplification
blockedBy: []
blocks: []
---

# Web-Only Simplification

**Brainstorm:** [report](../reports/brainstorm-260417-1334-web-only-simplification.md)
**Goal:** Strip over-engineered cloud sync + Tauri desktop. Single web SPA + minimal BE proxy.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 01 | Branch + Audit Imports | completed | XS |
| 02 | Strip FE Sync Code | completed | M |
| 03 | Strip Tauri Desktop | completed | M |
| 04 | Replace BE + Firebase Auth | completed | M |
| 05 | Docs + CI Cleanup | completed | S |

## Architecture (Target)

```
Browser SPA (offline-first)
  ├─ IndexedDB (Dexie) — single source of truth
  ├─ Zustand: collections / requests / envs / history / settings / response
  ├─ Firebase JS SDK — Google sign-in (in-memory ID token)
  └─ HTTP client → POST /proxy (Bearer token)
                         ↓
              Node Fastify BE (stateless)
                         ├─ firebase-admin verify
                         ├─ undici forward
                         └─ stream response
```

## Key Constraints

- Sequential phases — no parallel execution
- Each phase ends with `pnpm build` + `pnpm lint` passing
- No data migration (clean slate accepted by owner)
- `requirement.md` left untouched

## Out of Scope

Data migration, MongoDB, mock server, team collab, cloud sync re-introduction.

## Acceptance (whole plan)

- [ ] `src-tauri/` removed
- [ ] `backend/` reduced to 3 TS files + config (~150 LoC)
- [ ] No FE imports of `sync-store` / `conflict-store` / `presence-store` / `workspace-store` / `services/sync/` / `services/auth-handler`
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` pass
- [ ] BE `/health` + sample `/proxy` E2E pass
- [ ] Firebase Google sign-in popup works, BE verifies token (when `REQUIRE_AUTH=true`)
- [ ] BE supports `REQUIRE_AUTH=false` for self-hosted/anonymous mode
- [ ] FE auto-routes localhost to direct fetch, remote to `/proxy`
- [ ] GitLab CI: lint + test only (no Windows, no Rust)
- [ ] Docs reflect new architecture
- [ ] Old completed sync plan dirs deleted (260313-1021, 260313-1351, 260316-1322)

## Validation Log

### Session 1 — 2026-04-17
**Trigger:** `/ck:plan validate` before implementation
**Questions asked:** 8

#### Confirmed Decisions

1. **[Architecture]** Auth gate model → **Optional auth: BE allows anonymous**
   - BE reads `REQUIRE_AUTH` env flag. When `false`, `/proxy` skips token verify.
   - Better OSS / self-host story. Phase 04 must implement env flag + branched preHandler.

2. **[Architecture]** Proxy response shape → **Raw passthrough + headers in JSON via meta**
   - BE streams upstream body bytes raw; emits `X-Upstream-Status`, `X-Upstream-Status-Text`, original `Content-Type`, and a single `X-Upstream-Headers` JSON header containing all upstream headers.
   - True streaming, no base64, supports binary. FE parses meta + reads body as blob/text.

3. **[Scope]** Data migration → **Wipe entire IndexedDB on first run**
   - On app boot, check `localStorage['localman.schemaResetV2']`. If absent, `Dexie.delete('localman')`, set flag, reload. Clean slate as brainstorm accepted.

4. **[Architecture]** Service account credential → **Inline JSON via `FIREBASE_SERVICE_ACCOUNT_JSON` env**
   - No file path, no `.secrets/` dir. Single env var holds JSON string. Easier Docker/CI/PaaS.
   - Service account JSON file in repo must be deleted from `backend/` and added to `.gitignore` defensively.

5. **[Architecture]** FE fetch routing → **Auto-detect localhost direct, rest via `/proxy`**
   - `http-client.ts` parses URL host. If host ∈ {`localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`} or `*.localhost` → browser fetch direct. Else → `/proxy`.
   - Localhost path needs no auth token. Remote path attaches Bearer when auth enabled.

6. **[Tradeoffs]** Dev runner → **`pnpm -r --parallel run dev`**
   - No new dep. Drop `concurrently`. Update root `dev:all` script accordingly.

7. **[Scope]** Old sync plan dirs → **Delete completely**
   - Remove `plans/260313-1021-*`, `plans/260313-1351-*`, `plans/260316-1322-*` (and any other sync-related completed dirs found via grep).

8. **[Risks]** BE tests → **Mocked-only (current plan)**
   - Confirm: no real-network E2E. Use `nock`/`undici-mock-agent`.

#### Action Items
- [ ] Phase 02: switch from "drop pending_changes table" to **full IndexedDB wipe via boot-time flag**
- [ ] Phase 03: `http-client.ts` rewrite must include localhost auto-detect branch
- [ ] Phase 04: BE adds `REQUIRE_AUTH` env flag; preHandler conditional
- [ ] Phase 04: BE proxy returns raw stream + `X-Upstream-*` headers (no JSON envelope)
- [ ] Phase 04: BE auth init reads `FIREBASE_SERVICE_ACCOUNT_JSON` (parse JSON), drop `.secrets/` strategy
- [ ] Phase 04: drop `concurrently`; use `pnpm -r --parallel run dev`
- [ ] Phase 04: FE Sign-in UI no longer hard-blocks Send button — show banner + only block when remote URL needs auth
- [ ] Phase 05: delete old sync plan dirs (3 confirmed + grep for others)
- [ ] Phase 05: `.gitignore` explicitly excludes `*firebase-adminsdk*.json` and any service account files
