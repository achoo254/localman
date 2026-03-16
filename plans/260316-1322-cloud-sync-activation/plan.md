---
status: done
created: 2026-03-16
slug: cloud-sync-activation
title: Cloud Sync Phase 2 Activation
---

# Cloud Sync Phase 2 Activation

Activate cloud sync for Localman — wire remaining mutation handlers, enable auto-sync, flip feature flag, update design.

## Current State (90% infrastructure complete)

| Component | Status |
|-----------|--------|
| Offline queue schema (`pending_changes` table) | Done |
| Queue functions (`offline-change-queue.ts`) | Done |
| Pull/push services (`entity-sync-service.ts`) | Done |
| 3-way merge engine (backend) | Done |
| Sync reconciliation | Done |
| Sync store (Zustand) | Done |
| Backend API routes | Done |
| Firebase Auth integration | Done (flagged OFF) |
| WebSocket architecture | Designed (not auto-connected) |
| `collections-store` sync wiring | Done (12 ops) |
| `request-store` sync wiring | **MISSING** |
| `environment-store` sync wiring | **MISSING** |
| Auto-sync on reconnect | **MISSING** |
| Feature flag | `CLOUD_SYNC: false` |
| Design: Account logged-in state | **MISSING** |

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Wire request-store mutations](./phase-01-wire-request-store.md) | High | S | Done |
| 2 | [Wire environment-store mutations](./phase-02-wire-environment-store.md) | High | S | Done |
| 3 | [Auto-sync on reconnect](./phase-03-auto-sync-reconnect.md) | High | S | Done |
| 4 | [Feature flag + integration test](./phase-04-feature-flag-integration.md) | High | M | Done |
| 5 | [Design: Account logged-in state](./phase-05-design-account-logged-in.md) | Medium | S | Done |
| 6 | [E2E testing + edge cases](./phase-06-e2e-testing.md) | High | M | Done |

## Dependencies

```
Phase 1 ─┐
Phase 2 ─┤→ Phase 4 → Phase 6
Phase 3 ─┘
Phase 5 (independent, can parallel with 1-3)
```

## Risk Assessment

- **Low risk:** Phases 1-2 are mechanical wiring — pattern exists in collections-store
- **Medium risk:** Phase 3 auto-sync needs careful debounce to avoid rapid-fire syncs
- **Medium risk:** Phase 4 flipping flag may surface dormant bugs in sync services
- **Mitigation:** Phase 6 covers edge cases (offline→online, conflict, concurrent edits)
