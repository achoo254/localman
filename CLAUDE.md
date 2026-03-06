# Localman — CLAUDE.md

## Project Overview

**Localman** is an offline-first desktop API client (Postman alternative) built with Tauri + React + TypeScript.

- Tagline: The API client that lives on your machine, syncs to the cloud, and never needs the internet to work.
- Current phase: Phase 1 MVP (Desktop app, offline-first)

## Tech Stack

### Desktop App (Phase 1 — Active)
- **Framework:** Tauri (Rust) + React + TypeScript
- **Storage:** IndexedDB via Dexie.js (source of truth)
- **State:** Zustand
- **UI:** Tailwind CSS + Radix UI
- **Code editor:** CodeMirror 6
- **HTTP client:** Native fetch + Tauri HTTP plugin (bypass CORS)
- **Script sandbox:** QuickJS

### Backend (Phase 2 — Future)
- Node.js + Fastify or Go (Gin)
- PostgreSQL + Redis
- JWT auth (access 15min + refresh 30d)

## Architecture

### Offline-First Data Flow
1. User action → write to IndexedDB → add to `pending_sync` queue
2. When online → flush queue to Cloud API
3. Sync: event sourcing + Last-Write-Wins (LWW) by `updated_at`

### IndexedDB Stores
- `collections` — API request groups
- `requests` — individual API requests
- `environments` — env variables
- `history` — request execution log
- `settings` — preferences, encrypted refresh token
- `pending_sync` — offline sync queue

## Design System

- **Theme:** Dark-first (`#0d0f14` / `#12151c` / `#181c25`)
- **Accent:** `#4f8ef7` (blue)
- **Method colors:** GET=green, POST=orange, PUT=yellow, DELETE=red, PATCH=purple
- **Fonts:** JetBrains Mono (code) + Syne (UI headlines)
- **Spacing:** 4px base unit, border-radius 6-8px

## Layout Structure

```
Titlebar: Logo | Tabs | Sync Status
Env bar: Environment selector | Variable preview
Sidebar | Request Bar: Method | URL | Send
         Request Tabs: Params | Auth | Headers | Body
         Pane Left (Request) | Pane Right (Response)
Status bar: DB status | Request count | Sync time
```

## Key UX Principles

- Auto-save everywhere (no Ctrl+S needed)
- Keyboard shortcuts: Ctrl+Enter=Send, Ctrl+T=New tab
- Drag-and-drop for collections/requests
- Toast notifications (no modals for minor feedback)
- Undo/Redo (Ctrl+Z) for important actions

## Phase 1 MVP Features

### Request Builder
- HTTP Methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- URL bar with variable interpolation (`{{baseUrl}}/users`)
- Params, Headers, Body (JSON/FormData/Multipart/Raw/Binary), Auth tabs
- Pre-request & post-response scripts (JS sandbox)

### Response Viewer
- Status code + time + size
- JSON highlight + collapsible, HTML preview, Raw
- Headers, cookies, timeline (DNS→TCP→TLS→Send→Receive)

### Collections
- CRUD with nested folders, drag-and-drop
- Import/Export: JSON, Postman Collection v2.1, OpenAPI 3.0, cURL

### Environments
- Multiple envs (Dev/Staging/Prod), global + env variables
- Secret variables (masked), dynamic vars (`{{$guid}}`, `{{$timestamp}}`)

## Directory Structure (to be created)

```
src/
  components/     # React UI components
  stores/         # Zustand state stores
  db/             # Dexie.js IndexedDB layer
  services/       # HTTP client, sync engine
  utils/          # Helpers, variable interpolation
  types/          # TypeScript types
src-tauri/        # Rust/Tauri backend
```

## Development Notes

- Keep files under 200 lines — split into focused modules
- Use kebab-case file names
- Follow YAGNI/KISS/DRY principles
- Phase 1: IndexedDB only (no backend)
- Phase 2: Migrate storage to SQLite via Tauri

## Reference Docs

- [requirement.md](./requirement.md) — full product spec and roadmap
- Tauri docs: https://tauri.app/docs
- Dexie.js: https://dexie.org
