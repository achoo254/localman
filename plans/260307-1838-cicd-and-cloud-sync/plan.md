---
title: "CI/CD + Cloud Sync"
description: "GitLab CI/CD for Windows builds + Phase 11 cloud sync implementation"
status: completed
priority: P1
effort: 5d
branch: main
tags: [gitlab-ci, tauri, cloud-sync, windows]
created: 2026-03-07
---

# CI/CD + Cloud Sync — Implementation Plan

## Agent Workflow Protocol

**READ FIRST:** [workflow-agent-execution-protocol.md](../260306-1134-localman-desktop-mvp/workflow-agent-execution-protocol.md)

Same conventions: code → self-review → test → commit → push → GitLab issues.

---

## Overview

Two sequential phases continuing from the completed MVP (phases 00–10):

1. **GitLab CI/CD** — automated lint/test on every push, Windows `.msi` build on git tags
2. **Cloud Sync (Phase 11)** — generic HTTP bidirectional sync of collections (already designed)

## Phases

| # | Phase | Est. | Status |
|---|-------|------|--------|
| 01 | [GitLab CI/CD — Windows](phase-01-gitlab-cicd-windows.md) | 1d | completed |
| 02 | [Cloud Sync](../260306-1134-localman-desktop-mvp/phase-11-cloud-sync.md) | 4d | completed |

## Key Notes

- Repo is on GitLab (`gitlabs.inet.vn`), use `.gitlab-ci.yml` — NOT GitHub Actions
- Windows-only target, no cross-platform matrix needed
- Phase 11 is fully designed in existing plan file (linked above) — no re-design needed
- Phase 01 must complete before Phase 02 (CI validates every commit)

## GitLab Info

```
Host:       gitlabs.inet.vn
Project ID: 296
URL:        https://gitlabs.inet.vn/dattqh/localman
```
