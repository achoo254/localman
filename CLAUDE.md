# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Localman** is an offline-first web SPA API client (Postman alternative) built with React + TypeScript + Vite, backed by an optional lightweight Node.js + Fastify proxy for CORS bypass and Firebase Google sign-in.

- Tagline: Offline-first web API client. Runs in your browser. Optional self-hosted proxy for CORS bypass.
- Current status: Web-only refactor complete. All data stored in IndexedDB. No desktop/Tauri layer.

## GitHub

**CLI tool:** `gh` — used for issues, PRs, releases, and CI workflow inspection.
**CI:** GitHub Actions (see `.github/workflows/`) runs lint + type-check + tests on push.
**Concurrency:** max 1 phase at a time — strictly sequential, no parallel phase execution.

---

## Development Commands

Repo is a pnpm workspace with two packages: `client/` (web SPA) and `backend/` (Fastify proxy). No root `package.json` — run all scripts via `pnpm --filter` or from inside the package dir.

```bash
pnpm install                          # Install deps for both packages
pnpm --filter client dev              # Vite dev server (port 5173)
pnpm --filter backend dev             # Fastify proxy (port 3001)
pnpm -r --parallel run dev            # Both concurrently
pnpm --filter client build            # Build client → client/dist
pnpm --filter client lint             # ESLint
pnpm --filter client type-check       # tsc --noEmit
pnpm --filter client test             # Vitest unit tests
pnpm --filter backend build           # Compile backend TypeScript
pnpm --filter backend test            # Backend tests
```

---

## Tech Stack

### Frontend (SPA)
- **Framework:** React + TypeScript + Vite
- **Storage:** IndexedDB via Dexie.js (source of truth, offline-first)
- **State:** Zustand
- **UI:** Tailwind CSS + Radix UI
- **Code editor:** CodeMirror 6
- **HTTP client:** Browser `fetch` via `/proxy` endpoint on Fastify backend (CORS bypass)
- **Auth:** Firebase JS SDK — Google OAuth sign-in, ID token stored in memory
- **Script sandbox:** QuickJS in Web Worker (serial queue — one script at a time)

### Backend (Fastify Proxy — optional, ~150 LoC stateless)
- **Framework:** Node.js + Fastify
- **HTTP proxy:** `undici` — forwards requests to target URLs, bypassing browser CORS
- **Auth:** `firebase-admin` — verifies Firebase ID tokens on protected routes
- **Self-host mode:** `REQUIRE_AUTH=false` → no Firebase required

---

## Architecture

### Offline-First Data Flow
All writes go to IndexedDB first — no sync queue:
1. User action → write to IndexedDB (instant feedback)
2. Send request → browser fetch → `/proxy` on BE → target URL
3. Response displayed + logged to history

### HTTP Routing
- Target URL is `localhost/*` → direct fetch (no proxy needed)
- Target URL is remote → POST `/proxy` with full request details → backend forwards via undici

### IndexedDB Stores (Dexie.js)
| Store | Purpose |
|---|---|
| `collections` | API request groups, nested folders |
| `requests` | Individual API requests |
| `environments` | Env variable sets (Dev/Staging/Prod) |
| `history` | Auto-logged request executions |
| `settings` | Preferences, encrypted refresh token |

### Auth
- Firebase Google sign-in via Firebase JS SDK
- ID token: memory only (never localStorage)
- Backend verifies ID token via `firebase-admin` (when `REQUIRE_AUTH=true`)
- `REQUIRE_AUTH=false` → skip auth entirely (self-host without Firebase)

---

## Directory Structure

```
client/                  # Web SPA
  src/
    components/          # React UI components
    stores/              # Zustand state stores
    db/                  # Dexie.js IndexedDB layer
    services/            # HTTP client, snippet generators, import/export
    utils/               # Helpers, variable interpolation
    types/               # TypeScript types
  public/                # Static assets
  index.html
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  eslint.config.js
  package.json
backend/                 # Fastify proxy
  src/
    index.ts             # Fastify server entry
    auth.ts              # Firebase token verification
    proxy.ts             # CORS proxy route handler
  Dockerfile
  package.json
docs/                    # Documentation + requirement.md (historical spec)
plans/                   # Implementation plans
localman-design-system.pen   # Pencil design file (root)
pnpm-workspace.yaml      # Workspace marker (no root package.json)
```

---

## Design System

**MANDATORY:** Before implementing any UI component, screen, or layout change:
1. Read `docs/design-guidelines.md` for design tokens, component patterns, and CSS conventions
2. Analyze `localman-design-system.pen` (Pencil file) for visual reference of all components and screens
3. Follow existing patterns — do NOT introduce new colors, fonts, or spacing values not in the design system

### Design Files
- **`docs/design-guidelines.md`** — Design tokens, Tailwind conventions, component CSS patterns
- **`localman-design-system.pen`** — Visual design file (36 components + 26 screens)

### Theme Summary
- **Theme:** Dark-first (`#0B1120` bg / `#0F172A` surface / `#1E293B` elevated)
- **Accent:** `#3B82F6` (blue)
- **HTTP method colors:** GET=`#10B981`, POST=`#3B82F6`, PUT=`#F59E0B`, DELETE=`#EF4444`, PATCH=`#8B5CF6`
- **Fonts:** JetBrains Mono (code areas) + Inter (UI text)
- **Spacing:** 4px base unit, border-radius 6–8px
- **UI library:** Radix UI (Dialog, ContextMenu, Select, DropdownMenu) + Tailwind CSS

---

## Layout

```
Titlebar:    Logo | Request Tabs | Auth Status
Env bar:     Environment selector | Variable preview
Sidebar    | Request Bar: Method | URL | Send
           | Request Tabs: Params | Auth | Headers | Body
           | Pane Left (Request) | Pane Right (Response)
Status bar:  DB status | Request count
```

---

## Key UX Constraints

- Auto-save on every change — no manual save
- `Ctrl+Enter` = Send, `Ctrl+T` = New tab, `Ctrl+Z` = Undo
- Variable interpolation: `{{varName}}` in URLs, headers, body
- Dynamic vars: `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`
- Toast notifications only — no modals for minor feedback

---

## MVP Scope

**In scope:** Request builder (all HTTP methods + auth types), response viewer, collections with nested folders, environments, history, import cURL/Postman v2.1/OpenAPI 3.0, pre/post scripts via QuickJS, Firebase Google sign-in.

**Out of scope:** Cloud sync, WebSocket client, GraphQL, mock server, team collaboration.

---

## Reference Docs

- [docs/requirement.md](./docs/requirement.md) — historical product spec (desktop era, kept for reference)
- [docs/design-guidelines.md](./docs/design-guidelines.md) — design tokens and component patterns
- [docs/system-architecture.md](./docs/system-architecture.md) — 2-tier web architecture
- [docs/deployment-guide.md](./docs/deployment-guide.md) — static FE + Docker BE deployment
- **CI:** GitHub Actions — lint + type-check + tests on every push (see `.github/workflows/`)
- Dexie.js: https://dexie.org
- Firebase JS SDK: https://firebase.google.com/docs/web/setup
