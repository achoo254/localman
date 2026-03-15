---
status: pending
created: 2026-03-15
branch: main
---

# Check for Updates — Localman Desktop App

## Overview
Implement auto-update capability using Tauri v2 updater plugin + GitHub Releases. App checks for updates on startup (+ every 4h) and via manual button. Toast → Dialog UX flow.

## Context
- Brainstorm: `../backend/plans/reports/brainstorm-260315-1517-check-for-updates.md`
- Research: `../backend/plans/reports/researcher-260315-1528-tauri-v2-updater-github-actions.md`

## Key Decisions
- **Delivery:** GitHub Releases (native Tauri integration)
- **Timing:** Background auto-check (startup + 4h) + Manual button
- **UX:** Toast notification → Dialog (changelog + download + install)
- **Platforms:** Windows + macOS + Linux
- **Signing:** Ed25519 via `tauri signer generate`

## Phases

| # | Phase | Status | Priority | Effort |
|---|-------|--------|----------|--------|
| 1 | [Signing & Config Setup](./phase-01-signing-and-config-setup.md) | pending | P0 | 1h |
| 2 | [Frontend Update Service & UI](./phase-02-frontend-update-service-and-ui.md) | pending | P0 | 3h |
| 3 | [GitHub Actions Release CI](./phase-03-github-actions-release-ci.md) | pending | P0 | 2h |
| 4 | [Version Sync & Cleanup](./phase-04-version-sync-and-cleanup.md) | pending | P1 | 1h |

## Dependencies
- Phase 2 depends on Phase 1 (pubkey in config)
- Phase 3 depends on Phase 1 (signing keys in secrets)
- Phase 4 independent

## Architecture
```
App startup / 4h interval / manual button
  → check() via @tauri-apps/plugin-updater
  → GET https://github.com/{owner}/localman/releases/latest/download/latest.json
  → Tauri compares version
  → If newer: Toast → Dialog → download() with progress → install() → relaunch()
```

## Risk Summary
- Signing key leak → store only in GitHub Secrets
- GitHub rate limit → graceful silent fallback
- Large binary on slow network → progress bar + cancel
