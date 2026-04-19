---
title: "Localman UI Polish — Typographic Identity System (Phase 1)"
description: "Font migration (Inter→Geist + Fraunces serif), EmptyState/Skeleton components, refactor ~15 generic empty/loading surfaces to typed editorial states."
status: pending
priority: P2
effort: 5h30m
branch: feat/ui-polish-typographic-identity
tags: [ui, typography, design-system, empty-states, fonts]
created: 2026-04-18
---

# Localman UI Polish — Typographic Identity System (Phase 1)

**Brainstorm source:** `plans/dattqh/reports/frontend-design-260418-2323-localman-ui-polish.md`
**Prerequisite:** `plans/dattqh/260418-1932-design-token-compliance/` (completed 2026-04-18)

## Summary

Post design-token-compliance, the token system is clean but ~15 surfaces still render generic `"No cookies." / "Loading…"` strings — no identity. This plan ships "Terminal Editorial" typographic identity: 3-font system (Fraunces serif + Geist UI + JetBrains Mono code), token additions, reusable `<EmptyState>` + `<Skeleton>` components, and sweeps all generic empty/loading surfaces.

## Goals

1. Replace Inter with Geist as `--font-sans`; add Fraunces as `--font-serif`
2. Add tokens: `--color-accent-warm`, `--color-danger-soft-deep`, `--shadow-tab-gradient`
3. Ship `<EmptyState>` (3 variants) + `<Skeleton>` (3 variants) as reusable primitives
4. Refactor 14 surfaces to use new components — 0 generic string literals remain
5. Fix `check-design-tokens.sh` staged-file handling + `request-tab-bar` shadow hardcode

## Phase List

| # | Phase | Files | Effort | Status |
|---|---|---|---|---|
| 1 | Font migration + token additions | `index.css`, `client/package.json` | 45m | pending |
| 2 | EmptyState + Skeleton components | 2 new files in `common/` | 60m | pending |
| 3 | Refactor 14 surfaces | ~14 component files | 90m | pending |
| 4 | Housekeeping + full verify | `check-design-tokens.sh`, `request-tab-bar.tsx`, CI verify | 45m | pending |

## Out of Scope

- Response viewer hero (ResponseHero component) — Phase 2 of UI polish roadmap
- Command palette (⌘K) — separate feature plan
- Framer Motion — CSS transitions only
- Light theme tokens — future work
- JSON viewer syntax color tuning — Phase 2

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inter→Geist layout shift | Medium | Medium | Screenshot sidebar/titlebar/tabs before switch; compare after |
| Fraunces loading FOUC | Low | Medium | Preload hint in `index.html`; fallback stack: `Fraunces, Georgia, serif` |
| Tailwind JIT not seeing new `--font-serif` | Low | Low | Add `@layer utilities` shim if needed, same pattern as typography tokens |
| Vietnamese char gap in Geist | Low | Medium | Validate "Không có dữ liệu" at 11px/16px after font load |

## Commit Plan (suggested)

```
feat(fonts): add Fraunces + Geist fontsource deps and update index.css tokens  [phase 1]
feat(components): add EmptyState editorial/compact/error variants               [phase 2a]
feat(components): add Skeleton mono-shimmer with prefers-reduced-motion         [phase 2b]
fix(surfaces): replace generic empty/loading strings with EmptyState (batch 1)  [phase 3a - cookies/headers/collections/history]
fix(surfaces): replace generic empty/loading strings with EmptyState (batch 2)  [phase 3b - docs/env/body/error-boundary/test-results]
fix(surfaces): replace generic empty/loading strings with EmptyState (batch 3)  [phase 3c - request-panel/app-layout/import/json-viewer/sidebar-tabs]
fix(design): tokenize request-tab-bar shadow + fix check-design-tokens.sh       [phase 4]
```
