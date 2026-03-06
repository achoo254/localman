# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Localman** is an offline-first desktop API client (Postman alternative) built with Tauri + React + TypeScript.

- Tagline: The API client that lives on your machine, syncs to the cloud, and never needs the internet to work.
- Current phase: Phase 1 MVP (Desktop app, offline-first) — **project scaffolding not yet started**

## Agent Execution Protocol

**MANDATORY:** Before starting any implementation phase, read:
`plans/260306-1134-localman-desktop-mvp/workflow-agent-execution-protocol.md`

This protocol defines the full autonomous workflow: code → self-review → test → commit → push → GitLab milestone/issue management. Every phase follows this protocol without exception.

**GitLab instance:** `gitlabs.inet.vn`
**CLI tool:** `glab` (not `gh`) — configured with `--hostname gitlabs.inet.vn`
**Concurrency:** max 1 phase at a time — strictly sequential, no parallel phase execution.

---

## Development Commands

Once scaffolded (Tauri + Vite), the standard commands will be:

```bash
pnpm install             # Install dependencies
pnpm tauri dev           # Start dev server + Tauri desktop window
pnpm dev                 # Vite dev server only (browser, limited CORS bypass)
pnpm build               # Build frontend
pnpm tauri build         # Build production desktop app (all platforms)
pnpm lint                # ESLint
pnpm type-check          # tsc --noEmit
pnpm test                # Vitest unit/integration tests
pnpm test:e2e            # Playwright E2E tests
```

Rust/Tauri backend:
```bash
cd src-tauri
cargo check              # Check Rust compilation
cargo clippy             # Rust linter
```

## Tech Stack

### Desktop App (Phase 1 — Active)
- **Framework:** Tauri (Rust) + React + TypeScript + Vite
- **Storage:** IndexedDB via Dexie.js (source of truth, offline-first)
- **State:** Zustand
- **UI:** Tailwind CSS + Radix UI
- **Code editor:** CodeMirror 6
- **HTTP client:** Tauri HTTP plugin (bypasses CORS — do NOT use browser fetch for API calls)
- **Script sandbox:** QuickJS (pre/post-request scripts)

### Backend (Phase 2 — Future)
- Node.js + Fastify or Go (Gin), PostgreSQL + Redis, JWT auth

## Architecture

### Critical: Offline-First Data Flow
All writes go to IndexedDB first — never directly to a remote API:
1. User action → write to IndexedDB → add to `pending_sync` queue
2. When online → flush queue to Cloud API
3. Conflict resolution: Last-Write-Wins (LWW) by `updated_at`

### IndexedDB Stores (Dexie.js)
| Store | Purpose |
|---|---|
| `collections` | API request groups, nested folders |
| `requests` | Individual API requests |
| `environments` | Env variable sets (Dev/Staging/Prod) |
| `history` | Auto-logged request executions |
| `settings` | Preferences, encrypted refresh token |
| `pending_sync` | Offline queue — flushed when online |

### Auth (Phase 2)
- Access token: memory only (never localStorage)
- Refresh token: IndexedDB `settings` store, encrypted
- Silent refresh on expiry; offline mode requires no token

## Directory Structure

```
src/
  components/     # React UI components
  stores/         # Zustand state stores
  db/             # Dexie.js IndexedDB layer
  services/       # HTTP client, sync engine
  utils/          # Helpers, variable interpolation
  types/          # TypeScript types
src-tauri/        # Rust/Tauri backend (Tauri commands, native HTTP)
```

## Design System

- **Theme:** Dark-first (`#0d0f14` bg / `#12151c` surface / `#181c25` elevated)
- **Accent:** `#4f8ef7` (blue)
- **HTTP method colors:** GET=green, POST=orange, PUT=yellow, DELETE=red, PATCH=purple
- **Fonts:** JetBrains Mono (code areas) + Syne (UI headlines)
- **Spacing:** 4px base unit, border-radius 6–8px

## Layout

```
Titlebar:    Logo | Request Tabs | Sync Status
Env bar:     Environment selector | Variable preview
Sidebar    | Request Bar: Method | URL | Send
           | Request Tabs: Params | Auth | Headers | Body
           | Pane Left (Request) | Pane Right (Response)
Status bar:  DB status | Request count | Sync time
```

## Key UX Constraints

- Auto-save on every change — no manual save
- `Ctrl+Enter` = Send, `Ctrl+T` = New tab, `Ctrl+Z` = Undo
- Variable interpolation: `{{varName}}` in URLs, headers, body
- Dynamic vars: `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`
- Toast notifications only — no modals for minor feedback

## Phase 1 MVP Scope

**In scope:** Request builder (all HTTP methods + auth types), response viewer, collections with nested folders, environments, history, import cURL/Postman v2.1/OpenAPI 3.0, pre/post scripts via QuickJS.

**Out of scope for Phase 1:** Cloud sync, WebSocket client, GraphQL, mock server, team collaboration.

## Reference Docs

- [requirement.md](./requirement.md) — full product spec, roadmap, competitive analysis
- Tauri docs: https://tauri.app/docs
- Dexie.js: https://dexie.org
