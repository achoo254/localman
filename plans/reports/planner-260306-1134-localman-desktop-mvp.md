# Planner Report — Localman Desktop MVP

**Date:** 2026-03-06
**Plan:** `plans/260306-1134-localman-desktop-mvp/`

## Summary

Created comprehensive 10-phase implementation plan for Localman Desktop MVP — an offline-first API client (Postman alternative) built with Tauri v2 + React + TypeScript.

## Plan Structure

| Phase | File | Est. | Dependencies |
|-------|------|------|-------------|
| 01 Project Setup | phase-01-project-setup.md | 3d | none |
| 02 Database Layer | phase-02-database-layer.md | 3d | P01 |
| 03 Request Builder | phase-03-request-builder.md | 5d | P01, P02 |
| 04 HTTP Client | phase-04-http-client.md | 4d | P01-P03 |
| 05 Collections | phase-05-collections-sidebar.md | 5d | P01, P02 |
| 06 Environments | phase-06-environments.md | 4d | P01, P02, P04 |
| 07 History | phase-07-history.md | 2d | P02, P04 |
| 08 Import/Export | phase-08-import-export.md | 4d | P02, P05 |
| 09 Scripts | phase-09-scripts-sandbox.md | 5d | P04 |
| 10 Packaging | phase-10-packaging.md | 5d | all |

**Total estimate:** ~40 working days (~2 months of dev time)

## Key Architecture Decisions

1. **Dexie.js v4** with `liveQuery` for reactive IndexedDB queries — eliminates manual subscription management
2. **Separate folders table** (flat, not nested JSON) — enables efficient drag-drop and unlimited nesting
3. **UUIDs** for all entity IDs — future sync compatibility
4. **QuickJS WASM** (not Rust-side) for script sandbox — simpler integration, Web Worker isolation
5. **Service layer pattern** — components never access Dexie tables directly
6. **Zustand stores per domain** — request, response, collections, environment, history, settings

## Parallelization Opportunities

After P01+P02 complete:
- P03 (Request Builder) and P05 (Collections) can run in parallel
- P07 (History) and P09 (Scripts) can run in parallel after their deps

## Files Created

- `plans/260306-1134-localman-desktop-mvp/plan.md`
- `plans/260306-1134-localman-desktop-mvp/phase-01-project-setup.md`
- `plans/260306-1134-localman-desktop-mvp/phase-02-database-layer.md`
- `plans/260306-1134-localman-desktop-mvp/phase-03-request-builder.md`
- `plans/260306-1134-localman-desktop-mvp/phase-04-http-client.md`
- `plans/260306-1134-localman-desktop-mvp/phase-05-collections-sidebar.md`
- `plans/260306-1134-localman-desktop-mvp/phase-06-environments.md`
- `plans/260306-1134-localman-desktop-mvp/phase-07-history.md`
- `plans/260306-1134-localman-desktop-mvp/phase-08-import-export.md`
- `plans/260306-1134-localman-desktop-mvp/phase-09-scripts-sandbox.md`
- `plans/260306-1134-localman-desktop-mvp/phase-10-packaging.md`

## Tasks Created

10 tasks (IDs #1-#10) with dependency chains configured. Phase 01 is the only unblocked starting task.

## Unresolved Questions

1. **Tauri v2 HTTP plugin timing granularity** — does it expose DNS/TCP/TLS breakdown or just total time? Phase 04 assumes total-only for MVP.
2. **QuickJS WASM bundle size impact** — estimated ~500KB, needs verification. Lazy-loading mitigates.
3. **macOS code signing** — requires Apple Developer account. Plan assumes unsigned beta for initial testing.
4. **OAuth 2.0 auth type** — requirement mentions it but plan defers to Phase 2 (complex flow, needs browser redirect).
