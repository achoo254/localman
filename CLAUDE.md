# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Localman** is an offline-first desktop API client (Postman alternative) built with Tauri + React + TypeScript.

- Tagline: The API client that lives on your machine, syncs to the cloud, and never needs the internet to work.
- Current status: Phases 00–09 + 11 **completed**. Phase 10 (Packaging & Polish) **in progress** — remaining: perf optimization, Tauri bundler config, cross-platform testing, CI/CD, final UI polish.

## Agent Execution Protocol

**MANDATORY:** Before starting any implementation phase, read:
`plans/260306-1134-localman-desktop-mvp/workflow-agent-execution-protocol.md`

This protocol defines the full autonomous workflow: code → self-review → test → commit → push → GitHub PR/issue management. Every phase follows this protocol without exception.

**GitHub:** Public repository on github.com
**CLI tool:** `gh` (GitHub CLI)
**Auth:** No authentication needed for public repository access. See `docs/workflow-guide.md` for GitHub API patterns.
**Concurrency:** max 1 phase at a time — strictly sequential, no parallel phase execution.

---

## Development Commands

```bash
pnpm install             # Install dependencies
pnpm tauri dev           # Start dev server + Tauri desktop window
pnpm dev                 # Vite dev server only (browser, limited CORS bypass)
pnpm build               # Build frontend
pnpm tauri build         # Build production desktop app (all platforms)
pnpm lint                # ESLint
pnpm type-check          # tsc --noEmit
pnpm test                # Vitest unit/integration tests
pnpm test -- -t "test name pattern"  # Run single test by name
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
- **CORS / HTTP:** In Tauri, all API requests use plugin-http only (no browser fetch fallback); if the plugin is unavailable the app shows a clear error. The Vite dev server allows WebView origins (e.g. `null`, localhost) so the app and HMR load correctly in the Tauri window.
- **Script sandbox:** QuickJS in Web Worker (serial queue — one script at a time; no concurrent execution)

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
| `pending_sync` | Offline queue — flushed when online (**Phase 2, not yet in DB schema**) |

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

**MANDATORY:** Before implementing any UI component, screen, or layout change:
1. Read `docs/design-guidelines.md` for design tokens, component patterns, and CSS conventions
2. Analyze `localman-design-system.pen` (Pencil file) for visual reference of all components and screens
3. Follow existing patterns — do NOT introduce new colors, fonts, or spacing values not in the design system

### Design Files
- **`docs/design-guidelines.md`** — Design tokens, Tailwind conventions, component CSS patterns, modal/menu/dropdown specs
- **`localman-design-system.pen`** — Visual design file (36 reusable components + 26 screens) covering:
  - Design tokens (colors, HTTP methods, spacing)
  - Components (buttons, inputs, tabs, badges, toggles, toasts, cards, modals)
  - App layout (full 1440×900 with sidebar, request builder, response viewer)
  - Context menus (collection, folder, request)
  - Dropdowns (HTTP method, environment, workspace switcher)
  - Selectors (auth type, body type, sidebar tabs)
  - Request tab states (Params, Auth, Headers, Body with content)
  - Settings pages (General, Editor, Proxy, Data, Account, About)
  - Modals (Name Input, Save Request, Import, Export, Keyboard Shortcuts, Environment Manager, Conflict Resolution)

### Theme Summary
- **Theme:** Dark-first (`#0B1120` bg / `#0F172A` surface / `#1E293B` elevated)
- **Accent:** `#3B82F6` (blue)
- **HTTP method colors:** GET=`#10B981`, POST=`#3B82F6`, PUT=`#F59E0B`, DELETE=`#EF4444`, PATCH=`#8B5CF6`
- **Fonts:** JetBrains Mono (code areas) + Inter (UI text)
- **Spacing:** 4px base unit, border-radius 6–8px
- **UI library:** Radix UI (Dialog, ContextMenu, Select, DropdownMenu) + Tailwind CSS

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
- [docs/cross-platform-testing.md](./docs/cross-platform-testing.md) — cross-platform testing checklist (Windows/macOS/Linux and performance)
- **CI:** GitHub Actions — lint + test on push; Windows build on tag `v*`. Details: [phase-01-gitlab-cicd-windows.md](./plans/260307-1838-cicd-and-cloud-sync/phase-01-gitlab-cicd-windows.md)
- Tauri docs: https://tauri.app/docs
- Dexie.js: https://dexie.org
