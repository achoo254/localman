---
title: "Localman Desktop MVP"
description: "Phase 1 MVP implementation plan for offline-first desktop API client"
status: pending
priority: P1
effort: 4 months
branch: main
tags: [tauri, react, typescript, api-client, mvp]
created: 2026-03-06
---

# Localman Desktop MVP — Implementation Plan

## Overview

Offline-first desktop API client built with Tauri v2 + React + TypeScript. Postman alternative focusing on speed, privacy, and local-first data.

## Tech Stack

Tauri v2 (Rust) | React 19 + TypeScript | Dexie.js (IndexedDB) | Zustand | Tailwind CSS + Radix UI | CodeMirror 6 | QuickJS

## Architecture

```
User Action -> Zustand Store -> Dexie.js (IndexedDB) -> UI render
                                    |
                              pending_sync queue (Phase 2)
```

Request execution: React -> Tauri IPC -> Rust HTTP client (bypass CORS) -> Response back via IPC

## Phases

| # | Phase | Est. | Status |
|---|-------|------|--------|
| 01 | [Project Setup](phase-01-project-setup.md) | 3d | pending |
| 02 | [Database Layer](phase-02-database-layer.md) | 3d | pending |
| 03 | [Request Builder](phase-03-request-builder.md) | 5d | pending |
| 04 | [HTTP Client & Response](phase-04-http-client.md) | 4d | pending |
| 05 | [Collections & Sidebar](phase-05-collections-sidebar.md) | 5d | pending |
| 06 | [Environments](phase-06-environments.md) | 4d | pending |
| 07 | [History](phase-07-history.md) | 2d | pending |
| 08 | [Import/Export](phase-08-import-export.md) | 4d | pending |
| 09 | [Scripts Sandbox](phase-09-scripts-sandbox.md) | 5d | pending |
| 10 | [Packaging & Polish](phase-10-packaging.md) | 5d | pending |

## Key Dependencies

- Phases 1-2 must complete before all others
- Phase 3-4 are tightly coupled (builder + executor)
- Phase 5-7 depend on DB layer (Phase 2)
- Phase 8 depends on Phase 5 (collections model)
- Phase 9 depends on Phase 4 (HTTP client)
- Phase 10 is final

## Directory Structure

```
localman/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # Sidebar, Titlebar, StatusBar
│   │   ├── request/            # Builder, tabs, URL bar
│   │   ├── response/           # Viewer, JSON highlight
│   │   ├── collections/        # Tree, CRUD dialogs
│   │   ├── environments/       # Env manager, variable editor
│   │   └── common/             # Shared UI primitives
│   ├── stores/                 # Zustand stores
│   ├── db/                     # Dexie.js schema, migrations, services
│   ├── services/               # HTTP client, interpolation, import/export
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript interfaces
│   └── utils/                  # Helpers
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── commands/           # Tauri IPC commands
│       └── http/               # HTTP client module
├── public/                     # Static assets
└── tests/                      # E2E tests
```

## Success Criteria

- Startup < 2s, memory < 150MB
- All 7 HTTP methods work with CORS bypass
- Collections with nested folders
- Variable interpolation in URL/headers/body
- JSON response highlighting
- cURL + Postman import
- Cross-platform builds (Windows/macOS/Linux)
