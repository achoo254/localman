# Localman

> **The API client that lives on your machine, syncs to the cloud, and never needs the internet to work.**

Localman is a privacy-first, offline-capable desktop API client (Postman alternative) built with **Tauri + React + TypeScript**. All your API data stays on your machine — no vendor lock-in, no cloud dependency, no privacy concerns.

**Version:** 0.2.0 | **Status:** Core API client complete. Cloud sync, WebSocket real-time, and auto-updates deployed. [See roadmap](docs/development-roadmap.md).

---

## Why Localman?

### The Problem with Postman
- **Privacy Risk:** Your API calls, auth tokens, and requests route through Postman's cloud servers
- **Expensive:** Team subscriptions cost $180+/user/year; personal tier limits collections
- **Slow:** Electron-based (heavy RAM, slow startup, sluggish UI)
- **No Internet, No Work:** Requires internet for most features
- **Vendor Lock-in:** Your API library is trapped in Postman's ecosystem

### The Localman Solution

| | Localman | Postman |
|---|---|---|
| **Data Location** | Your machine only | Postman servers |
| **Offline Capable** | ✅ Works 100% offline | ❌ Requires internet |
| **Cost** | ✅ Free, no limits | ❌ $180+/user/year |
| **Performance** | ✅ Tauri (Rust) — instant startup | ❌ Electron — slow to load |
| **Privacy** | ✅ No cloud dependency | ❌ All data sent to cloud |
| **Cloud Sync** | ✅ Optional, end-to-end | ❌ Mandatory by design |
| **Memory Usage** | ✅ ~50MB | ❌ ~300MB (Electron) |
| **Startup Time** | ✅ <1s | ❌ 3-5s |

---

## Features

### Core API Client
- **Request Builder** — All HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- **Authentication Types** — Basic, Bearer, API Key, OAuth 2.0 with auto-refresh
- **Headers & Query Params** — Key-value editor with auto-save
- **Request Body** — Form data, JSON, XML, raw text (syntax-highlighted)
- **Responses** — Pretty-print JSON/HTML, view status codes, headers, cookies

### Organization & Collaboration
- **Collections & Folders** — Organize requests in nested folder hierarchies
- **Team Workspaces** — Share collections with team members (Firebase-based)
- **Environments** — Variable interpolation (`{{varName}}`, `{{$guid}}`, `{{$timestamp}}`)
- **Real-Time Updates** — WebSocket sync for live collaboration (presence avatars, conflict resolution)

### Power User Features
- **Code Snippets** — Generate executable code in 16 languages (cURL, Python, JavaScript, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie)
- **Pre/Post Scripts** — QuickJS sandbox to manipulate requests/responses dynamically
- **API Documentation** — Embed markdown descriptions, generate HTML exports with table of contents
- **History & Analytics** — Auto-logged executions, searchable, re-run with 1 click
- **Import/Export** — Support cURL, Postman v2.1, OpenAPI 3.0 specs; native JSON backup

### Developer Experience
- **Auto-Save** — Every change saved instantly to local database
- **Keyboard Shortcuts** — `Ctrl+Enter` = Send, `Ctrl+T` = New tab, `Ctrl+Z` = Undo
- **Offline-First Architecture** — Works without internet; syncs when online (Last-Write-Wins + 3-way merge)
- **Auto-Update** — Signed GitHub releases with cross-platform builds (Windows/macOS/Linux)

---

## Quick Start

### Prerequisites
- **Node.js** 20+ and **pnpm**
- **Rust** (for Tauri): [rustup.rs](https://rustup.rs)
  - Windows: Run `rustup-init.exe`, restart terminal
  - macOS/Linux: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Installation

```bash
git clone https://github.com/achoo254/localman.git
cd localman
pnpm install
pnpm tauri dev        # Launch desktop app with hot reload
```

**Browser-only development** (limited CORS bypass):
```bash
pnpm dev              # Vite dev server on http://localhost:5173
```

---

## Cloud Sync (Optional)

Localman works 100% offline. To enable cloud sync with team collaboration:

```bash
cd backend
cp .env.example .env   # Fill in FIREBASE_SERVICE_ACCOUNT, DATABASE_URL
npm install
npm run dev            # Hono server on http://localhost:3000
```

See [Backend Setup Guide](docs/codebase-summary.md#backend-architecture) for PostgreSQL configuration.

---

## Development

### Commands

```bash
pnpm install          # Install all dependencies
pnpm tauri dev        # Desktop app with hot reload
pnpm build            # Build frontend assets
pnpm tauri build      # Production desktop build (all platforms)
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking
pnpm test             # Unit tests (Vitest, 35 tests, 8 suites)
pnpm test:e2e         # E2E tests (Playwright)
```

### Quality Checks

```bash
pnpm lint && pnpm type-check && pnpm test  # Full quality pass
```

### Rust Backend (Tauri)

```bash
cd src-tauri
cargo check           # Check Rust compilation
cargo clippy          # Lint Rust code
```

---

## Architecture

Localman uses **offline-first architecture**:
1. All writes go to **IndexedDB** (local database) first
2. UI renders immediately (no network latency)
3. When online, changes sync to backend (Firebase + PostgreSQL)
4. Conflict resolution: Last-Write-Wins by `updated_at` timestamp
5. Works perfectly offline — cloud is optional

**Tech Stack:**
- **Frontend:** React 19 + TypeScript 5.8 + Zustand 5 (state management)
- **Database:** Dexie.js (IndexedDB wrapper) + Drizzle ORM (backend)
- **Desktop:** Tauri 2 (Rust bridge, CORS-free HTTP)
- **UI:** Tailwind CSS 4 + Radix UI (accessible components)
- **Scripting:** QuickJS WASM (safe sandbox for pre/post scripts)
- **Editor:** CodeMirror 6 (syntax highlighting)
- **Backend:** Hono 4 + Firebase Admin SDK + PostgreSQL

See [System Architecture](docs/system-architecture.md) for detailed data flow diagrams.

---

## Documentation

| Document | Purpose |
|---|---|
| [**Codebase Summary**](docs/codebase-summary.md) | Directory structure, 84 components, 11 stores, 50+ services |
| [**System Architecture**](docs/system-architecture.md) | Data flow, offline-first pattern, sync engine, 3-way merge |
| [**Design Guidelines**](docs/design-guidelines.md) | Design tokens, Tailwind conventions, component patterns |
| [**Development Roadmap**](docs/development-roadmap.md) | Phase history, completed features, upcoming work |
| [**Code Standards**](docs/code-standards.md) | File naming, structure, TypeScript conventions |
| [**Workflow Guide**](docs/workflow-guide.md) | Request flow, keyboard shortcuts, debugging (Vietnamese) |
| [**Project Overview & PDR**](docs/project-overview-pdr.md) | Vision, problem statement, competitive analysis |
| [**Project Changelog**](docs/project-changelog.md) | Detailed record of all changes, features, and fixes |

---

## Testing & CI/CD

- **Unit Tests** — 35 tests (Vitest), run via `pnpm test`
- **E2E Tests** — Playwright smoke tests, run via `pnpm test:e2e`
- **Linting** — ESLint on every push
- **Type Checking** — TypeScript strict mode
- **CI Pipeline** — GitHub Actions: `ci.yml` (lint, test, type-check), `build-test.yml` (cross-platform), `release.yml` (tag-triggered builds)
- **Release Builds** — GitHub Actions auto-builds on tag `v*` (Windows/macOS/Linux) with signed updater

See [Cross-Platform Testing Checklist](docs/cross-platform-testing.md) for QA procedures.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/awesome-feature`)
3. **Code** — Follow [Code Standards](docs/code-standards.md)
4. **Test** — Ensure `pnpm test` and `pnpm lint` pass
5. **Commit** — Use conventional commit format (`feat:`, `fix:`, `docs:`, etc.)
6. **Push** — GitHub Actions will run CI checks
7. **Open PR** — Link to issue if applicable

---

## License

Licensed under the MIT License — see LICENSE file for details.

---

## Project Status

| Phase | Status | Features |
|---|---|---|
| **Core API Client** | ✅ Complete | Request builder, all HTTP methods, auth types |
| **Collections & Folders** | ✅ Complete | Nested organization, drag-drop, context menus |
| **Environments & Variables** | ✅ Complete | {{varName}} interpolation, dynamic vars ({{$guid}}, {{$timestamp}}) |
| **History & Scripts** | ✅ Complete | Auto-logged executions, QuickJS pre/post scripts |
| **Cloud Sync v1** | ✅ Complete | Firebase auth, team workspaces, entity sync |
| **WebSocket Real-Time** | ✅ Complete | Live presence, collaborative editing, auto-reconnect |
| **Code Snippets** | ✅ Complete | 16 language generators (Python, Go, JS, Java, etc.) |
| **Auto-Updater** | ✅ Complete | Signed GitHub Releases, cross-platform builds |
| **Cloud Sync v2** | ✅ Complete | 3-way merge, field-level conflict resolution |
| **API Documentation** | ✅ Complete | Markdown descriptions, HTML export with TOC |
| **Packaging & Polish** | 🔄 In Progress | Performance tuning, Tauri bundler config, cross-platform testing |

For detailed roadmap and known issues, see [Development Roadmap](docs/development-roadmap.md).

---

## Getting Help

- **Issues** — Found a bug? [Open an issue](https://github.com/achoo254/localman/issues)
- **Discussions** — Questions? [Start a discussion](https://github.com/achoo254/localman/discussions)
- **Docs** — Check [documentation](./docs) for detailed guides
- **Examples** — See [plans/](./plans) directory for architecture decisions and phase plans
