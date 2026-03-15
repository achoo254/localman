---
status: completed
completed: 2026-03-13
created: 2026-03-13
scope: Phase 1 offline-first release fixes
phases: 5
estimated_effort: medium
---

# Offline-First Release Fixes

**Goal:** Fix 5 must-fix + 2 nice-to-have items before Phase 1 public release.
**Context:** Brainstorm report: `plans/reports/brainstorm-260313-1351-offline-first-release-readiness.md`

## Phases

| # | Phase | Priority | Status | Effort |
|---|-------|----------|--------|--------|
| 01 | Granular Error Boundaries | CRITICAL | completed | Low |
| 02 | Request Timeout Wiring | HIGH | completed | Low |
| 03 | Draft Auto-Persist | CRITICAL | completed | Medium |
| 04 | Cloud UI "Coming Soon" | MEDIUM | completed | Low |
| 05 | IndexedDB Quota + History Cleanup | MEDIUM | completed | Low-Med |

## Key Dependencies

- Phase 01 first (prevents crashes during dev of other phases)
- Phases 02-05 independent, can be done in any order after 01
- Request timeout setting already exists in `src/types/settings.ts` + store + UI

## Out of Scope

- Cloud sync queue, auto-reconnect, conflict persistence (Phase 2)
- Online detection improvement (Phase 2)
- WebSocket fallback (Phase 2)
