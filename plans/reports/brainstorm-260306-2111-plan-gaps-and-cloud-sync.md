# Brainstorm Report: Plan Gaps Fix + Cloud Sync Architecture

**Date:** 2026-03-06
**Context:** Localman Desktop MVP — pre-implementation readiness review

---

## Problem Statement

1. Existing 10-phase plan had critical gaps preventing clean AI agent execution (Option B fix)
2. New requirement: cloud sync using Postman Collection v2.1 format with generic HTTP endpoints

---

## Part 1: Gaps Fixed (Option B)

### New Phase 00 — Bootstrap & Toolchain

Created `phase-00-bootstrap-toolchain.md` as canonical toolchain reference. All agents must read before starting Phase 01.

**Decisions locked:**

| Concern | Decision |
|---|---|
| Package manager | `pnpm` |
| Unit tests | Vitest + `@testing-library/react` |
| E2E tests | Playwright |
| Resizable panes | `react-resizable-panels` |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Script sandbox | `quickjs-emscripten` (QuickJS WASM) |
| Dexie hooks | `dexie-react-hooks` |
| Icons | `lucide-react` |

**Also includes:**
- Complete pnpm dep install commands (runtime + dev + Rust)
- Vitest config with jsdom + Tauri API mocks
- Playwright config (E2E on port 1420)
- `vite.config.ts` with Web Worker `format: 'es'` for QuickJS
- App startup hydration order (DB → settings → environments → collections → tabs → sync)
- Tab persistence decision: **YES** — open tabs persist via `settings` table keys

**Phase 01 updated** to reference Phase 00 instead of having its own dep list.
**CLAUDE.md updated**: `npm` → `pnpm`, added test commands.

---

## Part 2: Cloud Sync Architecture

### Requirements (confirmed via Q&A)

| Question | Answer |
|---|---|
| Storage format | Dexie normalized (internal), Postman v2.1 JSON (sync format only) |
| Protocol | Generic — user configures 4 separate HTTP endpoints |
| Auth | Custom headers + query params (both, user-configured) |
| Conflict resolution | Last-Write-Wins by `updated_at` |
| Scope | Collections only (not environments, history, settings) |

### Final Architecture

**Postman Collection v2.1 extended format:**
```json
{
  "info": {
    "_postman_id": "collection-uuid",
    "name": "My API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "x-localman-updated-at": "2026-03-06T10:00:05.000Z"
  },
  "item": [ ... ]
}
```

Standard Postman opens this without errors (ignores unknown `info` fields).
File identity on server: `{collection-id}.json` — stable across renames.

**User-configured sync endpoints:**
```
list_url    GET  https://server.com/sync/          → array of files
download    GET  https://server.com/sync/{filename}
upload      PUT  https://server.com/sync/{filename}
delete      DELETE https://server.com/sync/{filename}
```
Plus: custom headers table + query params table.

**Sync algorithm:**
1. Fetch server file list
2. Compare `x-localman-updated-at` with local `updated_at`
3. Upload if local newer, download if server newer
4. Create on either side if missing
5. Parallel execution (concurrency: 3)

**Trigger:** manual "Sync Now" + auto on app start (non-blocking).

### New Phase 11

Created `phase-11-cloud-sync.md`:
- Extends Phase 08 Postman exporter/importer with `x-localman-updated-at`
- `sync-service.ts` — reconcile algorithm
- `sync-http-client.ts` — configurable endpoints with headers/params
- `sync-store.ts` — status/progress Zustand store
- `sync-settings.tsx` — settings UI with "Test Connection"
- `sync-status-indicator.tsx` — titlebar badge

**plan.md updated** with Phase 00 and Phase 11, dependency graph updated.

---

## Implementation Considerations

- Server list response: handle both `string[]` and `{filename, updated_at}[]` — fall back to downloading files if no timestamp in list
- `{filename}` substitution in endpoint URLs — standard template pattern
- Delete sync: confirmation dialog before propagating to server
- HTTPS warning if user enters `http://` endpoint
- Never log sync headers/auth params (contains tokens)

---

## Risks

| Risk | Mitigation |
|---|---|
| Server list has no timestamps | Download each file, read `x-localman-updated-at` (slow path) |
| Clock skew between devices | ISO 8601 UTC — acceptable for single-user LWW |
| `http://` endpoint → token exposed | Show warning in settings UI |
| 404 on delete (already gone server-side) | Treat as success |

---

## Changes Made

| File | Action |
|---|---|
| `CLAUDE.md` | npm → pnpm, added test commands |
| `plan.md` | Added Phase 00 + Phase 11, updated dependencies |
| `phase-00-bootstrap-toolchain.md` | **Created** — full toolchain reference |
| `phase-01-project-setup.md` | Deps section → references Phase 00 |
| `phase-11-cloud-sync.md` | **Created** — full cloud sync phase |

---

## Unresolved Questions

- Server `list` endpoint response schema — documented as "handle both formats" but server-side implementation not specified (user's responsibility)
- Auto-sync interval? Currently: startup only + manual. No periodic background sync defined.
- Should environments be syncable in Phase 3+? Currently out of scope.
