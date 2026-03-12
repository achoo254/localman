---
title: "Internal Beta Release v0.1.0"
description: "Fix lint, build Windows+macOS artifacts, smoke test, distribute to testers"
status: in-progress
priority: P1
effort: 3h
branch: main
tags: [infra, release, packaging]
created: 2026-03-09
---

# Internal Beta Release — Localman v0.1.0

## Overview

Ship Localman v0.1.0 as internal beta on Windows + macOS. Feature-complete (Phases 00–12). Focus: fix CI blocker, produce installable artifacts, smoke test, distribute.

**Skip:** Code signing, auto-updater, Linux, performance benchmarks.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Fix lint errors | ✅ Complete | 30m | [phase-01](./phase-01-fix-lint-errors.md) |
| 2 | Build artifacts | ✅ Complete | 1h | [phase-02-build-artifacts.md](./phase-02-build-artifacts.md) |
| 3 | Smoke test | ✅ Automated 19/19 passed, manual pending | 1h | [phase-03-smoke-test.md](./phase-03-smoke-test.md) |
| 4 | Distribute | ✅ Complete | 30m | [phase-04-distribute.md](./phase-04-distribute.md) |

## Dependencies

- Phase 1 → unblocks CI pipeline
- Phase 2 → requires Phase 1 (clean lint)
- Phase 3 → requires Phase 2 (built artifacts)
- Phase 4 → requires Phase 3 (tested artifacts)

## Context

- Brainstorm: [brainstorm-260309-1703-production-readiness-internal-beta.md](../reports/brainstorm-260309-1703-production-readiness-internal-beta.md)
- UI Test: [ui-test-260309-1654-localman-browser-ui-tests.md](../reports/ui-test-260309-1654-localman-browser-ui-tests.md)
- CI config: `.gitlab-ci.yml` (Windows build on `v*` tag)
- Tauri config: `src-tauri/tauri.conf.json`
