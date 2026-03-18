# Codebase Summary

**Version:** 0.1.0
**Last Updated:** 2026-03-18
**Repository Size:** 314 files, ~342k tokens, 19,000 LOC (TypeScript + Rust)

High-level overview of Localman's directory structure, key modules, architecture, and codebase organization.

---

## Directory Structure

```
localman/
├── .github/
│   └── workflows/                    # GitHub Actions CI/CD
│       ├── ci.yml                   # Lint, type-check, test on push/PR
│       └── release.yml              # Multi-platform build on tag v*
│
├── backend/                          # Node.js cloud sync server (NEW — Phase 13)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.ts            # GET /api/health
│   │   │   ├── workspace-routes.ts  # Workspace CRUD (create, list, update)
│   │   │   ├── collection-routes.ts # Collection CRUD
│   │   │   ├── environment-routes.ts # Environment CRUD
│   │   │   ├── entity-sync-routes.ts # 3-way merge sync (pull/push)
│   │   │   └── sync.ts              # Legacy sync endpoints (deprecated)
│   │   ├── middleware/
│   │   │   ├── auth-guard.ts        # Firebase token verification
│   │   │   ├── workspace-rbac.ts    # Role-based access control (Admin/Editor/Viewer)
│   │   │   └── error-handler.ts     # Error formatting + logging
│   │   ├── db/
│   │   │   ├── schema.ts            # Main Drizzle schema (tables, relations)
│   │   │   ├── entity-schema.ts     # Collections, folders, requests tables
│   │   │   ├── workspace-schema.ts  # Workspaces, members, invites tables
│   │   │   ├── user-schema.ts       # Firebase users table
│   │   │   └── client.ts            # PostgreSQL connection pool + Drizzle client
│   │   ├── services/
│   │   │   ├── change-log-service.ts # 3-way merge, conflict detection
│   │   │   ├── merge-engine.ts      # LWW + 3-way merge logic
│   │   │   ├── invite-service.ts    # Workspace invitations
│   │   │   └── workspace-service.ts # Workspace CRUD logic
│   │   ├── ws/
│   │   │   ├── websocket-server.ts  # WebSocket server (Hono ws)
│   │   │   ├── channel-manager.ts   # Workspace channels
│   │   │   ├── message-router.ts    # Route WS messages to handlers
│   │   │   ├── presence-tracker.ts  # User presence + avatars
│   │   │   └── ws-auth.ts           # WebSocket token verification
│   │   ├── types/
│   │   │   ├── context.ts           # HonoContext with user & workspace
│   │   │   └── models.ts            # Request, Collection, Environment types
│   │   ├── app.ts                   # Hono app setup (routes, middleware, CORS)
│   │   ├── firebase.ts              # Firebase Admin SDK init
│   │   ├── env.ts                   # Environment variable validation (Zod)
│   │   └── index.ts                 # Server entry point
│   ├── deploy/
│   │   ├── nginx.conf               # Nginx reverse proxy (same-domain backend)
│   │   └── setup.sh                 # PostgreSQL + PM2 setup script
│   ├── ecosystem.config.cjs         # PM2 process manager config
│   ├── drizzle.config.ts            # Drizzle migration config
│   ├── package.json                 # Backend dependencies (Hono, Drizzle, Firebase)
│   ├── tsconfig.json                # TypeScript config
│   └── .env.example                 # Environment variables template
│
├── src/                              # Frontend React app
│   ├── components/                  # React UI components (87 files)
│   │   ├── collections/             # Collection tree, context menu, CRUD
│   │   │   ├── collection-tree.tsx       # Nested folder tree component
│   │   │   ├── collection-item.tsx       # Individual collection item
│   │   │   ├── folder-item.tsx           # Folder item with expand/collapse
│   │   │   ├── request-item.tsx          # Request item with method badge
│   │   │   ├── collection-section-header.tsx # Section header (Personal/Team)
│   │   │   ├── collection-context-menu.tsx   # Right-click menu (rename, delete, move)
│   │   │   ├── collections-tab-sections.tsx  # Personal + Team sections layout
│   │   │   ├── create-collection-dialog.tsx  # New collection modal
│   │   │   ├── create-folder-dialog.tsx      # New folder modal
│   │   │   ├── move-request-dialog.tsx       # Move request between collections
│   │   │   └── collection-search.tsx         # Search requests/folders
│   │   ├── request/                 # Request builder UI (17 files)
│   │   │   ├── url-bar.tsx               # Method selector + URL input + Send button
│   │   │   ├── request-tabs.tsx          # Tabs: Params, Headers, Body, Auth, Scripts
│   │   │   ├── params-tab.tsx            # Query params editor
│   │   │   ├── headers-tab.tsx           # Request headers editor
│   │   │   ├── body-tab.tsx              # Body type selector + editor
│   │   │   ├── auth-tab.tsx              # Auth type selector + config UI
│   │   │   ├── scripts-tab.tsx           # Pre/Post script editors
│   │   │   ├── body-editors/             # Body format editors
│   │   │   │   ├── json-editor.tsx
│   │   │   │   ├── form-data-editor.tsx
│   │   │   │   ├── raw-text-editor.tsx
│   │   │   │   └── xml-editor.tsx
│   │   │   ├── key-value-editor.tsx      # Shared key-value table component
│   │   │   ├── request-builder.tsx       # Container component
│   │   │   └── request-tabs-header.tsx   # Tab navigation bar
│   │   ├── response/                # Response viewer UI (12 files)
│   │   │   ├── response-pane.tsx         # Main response container
│   │   │   ├── response-body.tsx         # Body viewer with syntax highlight
│   │   │   ├── response-headers.tsx      # Headers key-value table
│   │   │   ├── response-cookies.tsx      # Cookies table
│   │   │   ├── response-status.tsx       # Status code + timing info
│   │   │   ├── syntax-viewer.tsx         # JSON/HTML/XML pretty-print
│   │   │   ├── test-results.tsx          # Post-script assertions output
│   │   │   ├── response-tabs.tsx         # Tab navigation (Body, Headers, Cookies, etc.)
│   │   │   └── console-output.tsx        # Pre/Post script console.log() output
│   │   ├── common/                  # Shared UI components (9 files)
│   │   │   ├── error-boundary.tsx        # Error boundary for component crashes
│   │   │   ├── toast.tsx                 # Toast notification component
│   │   │   ├── modal.tsx                 # Modal dialog wrapper
│   │   │   ├── keyboard-shortcuts.tsx    # Shortcuts help modal
│   │   │   ├── loading-spinner.tsx       # Spinner component
│   │   │   ├── syntax-input.tsx          # Code editor with syntax highlight
│   │   │   ├── dialog-manager.tsx        # Global dialog manager (modals, alerts)
│   │   │   └── context-menu.tsx          # Context menu wrapper (Radix)
│   │   ├── settings/                # Settings pages (12 files)
│   │   │   ├── settings-page.tsx         # Settings tabs layout
│   │   │   ├── general-settings.tsx      # Theme, language, UI preferences
│   │   │   ├── editor-settings.tsx       # CodeMirror editor settings
│   │   │   ├── proxy-settings.tsx        # HTTP proxy configuration
│   │   │   ├── data-settings.tsx         # DB size, clear data, export/import
│   │   │   ├── account-settings.tsx      # Cloud sync login, user profile
│   │   │   ├── about-settings.tsx        # Version, credits, links
│   │   │   ├── cloud-sync-login.tsx      # Firebase OAuth login form
│   │   │   └── settings-header.tsx       # Settings page header
│   │   ├── layout/                  # App layout (6 files)
│   │   │   ├── main-layout.tsx           # Root layout (titlebar + sidebar + content)
│   │   │   ├── titlebar.tsx              # Top bar (logo, sync status, window controls)
│   │   │   ├── sidebar.tsx               # Left sidebar (resizable, tabs, collections)
│   │   │   ├── status-bar.tsx            # Bottom bar (DB status, request count, sync time)
│   │   │   ├── workspace-switcher.tsx    # Workspace dropdown selector
│   │   │   └── resizable-panes.tsx       # Resizable left/right panes
│   │   ├── environments/            # Environment management (5 files)
│   │   │   ├── environment-selector.tsx  # Dropdown to select active environment
│   │   │   ├── environment-manager.tsx   # Modal to manage environments
│   │   │   ├── environment-tab.tsx       # Sidebar tab for environments
│   │   │   ├── variable-table.tsx        # Variables key-value editor
│   │   │   └── variable-preview.tsx      # Variable interpolation preview
│   │   ├── history/                 # History viewer (4 files)
│   │   │   ├── history-tab.tsx           # Sidebar tab for history
│   │   │   ├── history-list.tsx          # Timeline of executions (grouped by date)
│   │   │   ├── history-filters.tsx       # Filter by request, status, date
│   │   │   └── history-item.tsx          # Single execution record
│   │   ├── import-export/           # Import/Export UI (2 files)
│   │   │   ├── import-dialog.tsx         # File picker + cURL paste
│   │   │   └── export-dialog.tsx         # Export format selector (JSON, Postman, OpenAPI)
│   │   ├── docs/                    # API documentation viewer (3 files)
│   │   │   ├── docs-tab.tsx              # Sidebar tab for docs
│   │   │   ├── docs-viewer.tsx           # Markdown/HTML renderer
│   │   │   └── docs-toc.tsx              # Table of contents sidebar
│   │   ├── sync/                    # Cloud sync UI (2 files)
│   │   │   ├── conflict-resolution.tsx   # Conflict resolution modal (diff viewer)
│   │   │   └── sync-status.tsx           # Sync status indicator (online/offline)
│   │   └── (individual feature components)
│   │
│   ├── stores/                      # Zustand state management (8 stores)
│   │   ├── request-store.ts              # Current request being edited
│   │   ├── response-store.ts             # Latest response + metadata
│   │   ├── collections-store.ts          # Collections tree (all + workspace-scoped)
│   │   ├── environment-store.ts          # Environments + active environment
│   │   ├── history-store.ts              # Request execution history
│   │   ├── settings-store.ts             # Preferences, auth tokens, feature flags
│   │   ├── sync-store.ts                 # Cloud sync state + pending changes
│   │   ├── ui-store.ts                   # UI state (sidebar open, active tab)
│   │   └── update-store.ts               # Auto-updater state
│   │
│   ├── services/                    # Business logic (50+ services)
│   │   ├── http-client.ts                # Tauri HTTP plugin wrapper
│   │   ├── request-preparer.ts           # Variable interpolation, auth headers
│   │   ├── script-executor.ts            # QuickJS sandbox, pre/post script execution
│   │   ├── import-export-service.ts      # cURL, Postman, OpenAPI import/export
│   │   ├── docs-export-service.ts        # HTML + Markdown documentation export
│   │   ├── sync/
│   │   │   ├── cloud-auth-client.ts      # Firebase/Better Auth integration
│   │   │   ├── cloud-sync-service.ts     # Pull/push sync with backend
│   │   │   └── conflict-resolver.ts      # 3-way merge + LWW
│   │   ├── snippet-generators/           # 16 code snippet generators
│   │   │   ├── curl-generator.ts
│   │   │   ├── javascript-generator.ts
│   │   │   ├── python-generator.ts
│   │   │   ├── go-generator.ts
│   │   │   ├── java-generator.ts
│   │   │   ├── php-generator.ts
│   │   │   ├── csharp-generator.ts
│   │   │   ├── ruby-generator.ts
│   │   │   ├── swift-generator.ts
│   │   │   ├── kotlin-generator.ts
│   │   │   ├── dart-generator.ts
│   │   │   ├── rust-generator.ts
│   │   │   ├── powershell-generator.ts
│   │   │   ├── httpie-generator.ts
│   │   │   ├── wget-generator.ts
│   │   │   └── curl-windows-generator.ts
│   │   └── (other services)
│   │
│   ├── db/                          # Dexie.js IndexedDB layer
│   │   ├── database.ts              # Database schema, stores, migrations
│   │   ├── migrations.ts            # Schema version upgrades
│   │   └── queries.ts               # Live query helpers
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-codemirror.ts        # CodeMirror editor hook
│   │   ├── use-auto-save.ts         # Auto-save with debounce
│   │   ├── use-collection-tree.ts   # Collection tree state
│   │   ├── use-live-query.ts        # Dexie live query wrapper
│   │   └── use-update-checker.ts    # Auto-update check
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── models.ts                # ApiRequest, Collection, Environment, etc.
│   │   ├── response.ts              # HttpResponse, PreparedRequest, etc.
│   │   ├── cloud-sync.ts            # Cloud sync types (SyncPayload, Conflict, etc.)
│   │   ├── settings.ts              # Settings types
│   │   └── index.ts                 # Re-exports
│   │
│   ├── utils/                       # Utility functions
│   │   ├── variable-interpolation.ts # {{varName}} interpolation logic
│   │   ├── format.ts                 # Format headers, body, response
│   │   ├── clipboard.ts              # Copy to clipboard helper
│   │   ├── validate.ts               # Validation helpers (URL, JSON, etc.)
│   │   ├── date.ts                   # Date formatting utilities
│   │   ├── storage.ts                # Browser storage helpers
│   │   ├── tauri-http-client.ts      # Tauri HTTP wrapper
│   │   └── (other utilities)
│   │
│   ├── index.css                    # Global styles (Tailwind CSS)
│   ├── App.tsx                      # Root component
│   ├── App.test.tsx                 # App integration tests
│   └── main.tsx                     # Entry point
│
├── src-tauri/                        # Tauri desktop bridge (Rust)
│   ├── src/
│   │   ├── lib.rs                   # Tauri command definitions
│   │   └── main.rs                  # App entry point, window configuration
│   ├── tauri.conf.json              # Tauri config (window, features, permissions)
│   └── Cargo.toml                   # Rust dependencies
│
├── tests/                            # Vitest unit tests (35 tests)
│   ├── services/
│   │   ├── request-preparer.test.ts
│   │   ├── script-executor.test.ts
│   │   └── (other service tests)
│   ├── utils/
│   │   ├── variable-interpolation.test.ts
│   │   └── (other utility tests)
│   └── (component tests)
│
├── e2e/                              # Playwright E2E tests (5 suites, 20 tests)
│   ├── send-request.spec.ts         # Send GET/POST/PUT/DELETE requests
│   ├── collections.spec.ts          # Create/organize collections
│   ├── environments.spec.ts          # Environment variables
│   ├── history.spec.ts              # History + re-run
│   ├── import-export.spec.ts        # Import cURL/Postman, export JSON
│   └── cloud-sync.spec.ts           # Cloud sync + conflicts
│
├── docs/                             # Project documentation
│   ├── README.md                    # Main documentation index
│   ├── codebase-summary.md          # This file
│   ├── system-architecture.md       # Data flow, sync engine, component hierarchy
│   ├── project-overview-pdr.md      # Product vision, requirements, specs
│   ├── code-standards.md            # File naming, conventions, quality standards
│   ├── design-guidelines.md         # Design tokens, component patterns
│   ├── development-roadmap.md       # Phase history, timeline
│   ├── project-changelog.md         # All significant changes
│   ├── workflow-guide.md            # Request flow, shortcuts
│   └── cross-platform-testing.md    # QA checklist (Windows/macOS/Linux)
│
├── plans/                            # Development plans and phase docs
│   ├── 260313-1021-infra-auth-team-collections-redesign/
│   │   ├── plan.md
│   │   ├── phase-01-firebase-auth-migration.md
│   │   └── (phase files)
│   └── (other plan directories)
│
├── public/                           # Static assets
│   ├── logo.svg
│   ├── favicon.ico
│   └── (other assets)
│
├── .github/workflows/                # GitHub Actions CI/CD
│   ├── ci.yml                        # Lint, test on push/PR
│   └── release.yml                   # Build, sign, release on tag
│
├── .gitignore                        # Git ignore rules
├── eslint.config.js                  # ESLint configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── playwright.config.ts              # Playwright E2E configuration
├── vite.config.ts                    # Vite build configuration
├── tsconfig.json                     # TypeScript configuration (shared)
├── pnpm-workspace.yaml              # pnpm workspace configuration
├── package.json                      # Root dependencies + scripts
├── pnpm-lock.yaml                    # Dependency lock file
├── CLAUDE.md                         # Development guidelines
└── requirement.md                    # Product brainstorming (Vietnamese)
```

---

## Frontend Architecture

### Components: 87 Files Organized by Feature

| Directory | Files | Purpose |
|---|---|---|
| `collections/` | 12 | Collection tree, CRUD dialogs, search |
| `request/` | 17 | Request builder UI (URL, params, headers, body, auth, scripts) |
| `response/` | 12 | Response viewer (status, headers, body, cookies, test results) |
| `common/` | 9 | Shared UI (error boundary, toast, modal, dialogs) |
| `settings/` | 12 | Settings pages (general, editor, proxy, data, account) |
| `layout/` | 6 | Main app layout (titlebar, sidebar, status bar) |
| `environments/` | 5 | Environment selector, manager, variable editor |
| `history/` | 4 | History timeline, filters, re-run |
| `import-export/` | 2 | Import/export dialogs |
| `docs/` | 3 | API documentation viewer |
| `sync/` | 2 | Conflict resolution modal, sync status |
| **Total** | **87** | **Full UI coverage** |

### Stores: 8 Zustand Stores

| Store | Purpose | Key State |
|---|---|---|
| `request-store` | Current request editor | `currentRequest`, `draft`, `isLoading` |
| `response-store` | Latest response | `response`, `status`, `duration`, `headers` |
| `collections-store` | Collections tree | `collections`, `folders`, `requests` |
| `environment-store` | Environments | `environments`, `activeEnvironment`, `variables` |
| `history-store` | Request history | `executions`, `filters`, pagination |
| `settings-store` | Preferences | `theme`, `editor`, `auth token`, `workspace` |
| `sync-store` | Cloud sync | `pendingChanges`, `conflicts`, `isSyncing` |
| `ui-store` | UI state | `sidebarOpen`, `activeTab`, `selectedRequest` |

### Services: 50+ Business Logic Services

| Service | Purpose | Key Methods |
|---|---|---|
| `http-client` | Tauri HTTP wrapper | `execute(request)`, `executeWithAuth(...)` |
| `request-preparer` | Variable interpolation + auth | `prepareRequest(request, env)` |
| `script-executor` | QuickJS sandbox | `executePreScript(...)`, `executePostScript(...)` |
| `import-export-service` | cURL, Postman, OpenAPI | `importCurl(...)`, `exportPostman(...)` |
| `cloud-sync-service` | Pull/push sync | `pull()`, `push()` |
| `conflict-resolver` | 3-way merge + LWW | `resolveConflict(local, remote, server)` |
| `snippet-generators` | 16 code generators | `generatePython()`, `generateGo()`, etc. |
| `docs-export-service` | HTML/Markdown export | `exportAsHtml()`, `exportAsMarkdown()` |

### Hooks: 5 Custom React Hooks

| Hook | Purpose |
|---|---|
| `useCodemirror` | CodeMirror editor integration |
| `useAutoSave` | Debounced auto-save to IndexedDB |
| `useCollectionTree` | Collection tree state + operations |
| `useLiveQuery` | Dexie live query wrapper (reactive DB) |
| `useUpdateChecker` | Auto-update version check |

### Database: IndexedDB (Dexie.js)

**Schema v4:**

| Store | Indexes | Purpose |
|---|---|---|
| `collections` | `id`, `workspaceId`, `updatedAt` | API request groups |
| `requests` | `id`, `collectionId`, `updatedAt` | Individual API requests |
| `environments` | `id`, `workspaceId`, `name` | Environment variable sets |
| `history` | `++`, `timestamp`, `requestId` | Execution history (auto-pruned to 1000) |
| `settings` | `key` | Preferences, auth tokens, feature flags |
| `folders` | `id`, `parentId`, `collectionId` | Folder hierarchy |
| `pendingSync` | `++`, `entityType`, `syncStatus` | Offline sync queue |
| `drafts` | `id` | Unsaved request drafts |

---

## Backend Architecture (Node.js + PostgreSQL)

### API Routes (Hono)

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/workspace` | POST, GET | Create, list workspaces |
| `/api/workspace/:id` | GET, PATCH, DELETE | Workspace CRUD |
| `/api/workspace/:id/members` | POST, GET, DELETE | Manage workspace members |
| `/api/workspace/:id/collections` | GET, POST | Collections in workspace |
| `/api/workspace/:id/sync/pull` | POST | Fetch delta changes |
| `/api/workspace/:id/sync/push` | POST | Upload local changes, get 3-way merge |
| `/ws` | WebSocket | Real-time updates, presence |

### Middleware Stack

1. **Auth Guard** — Firebase token verification (all routes except health)
2. **Workspace RBAC** — Role-based access control (Admin/Editor/Viewer)
3. **Error Handler** — Standardized error formatting + logging
4. **CORS** — Same-origin; WebSocket upgrade support

### Database (PostgreSQL + Drizzle ORM)

| Table | Columns | Purpose |
|---|---|---|
| `users` | `id`, `firebaseUid`, `email`, `name`, `avatar` | Firebase users |
| `workspaces` | `id`, `name`, `ownerId`, `createdAt`, `updatedAt` | Team workspaces |
| `workspace_members` | `workspaceId`, `userId`, `role` | Workspace membership + RBAC |
| `workspace_invites` | `id`, `workspaceId`, `email`, `role`, `expiresAt` | Pending invitations |
| `sync_collections` | `id`, `workspaceId`, `name`, `updatedAt` | Synced collections |
| `sync_requests` | `id`, `collectionId`, `method`, `url`, `updatedAt` | Synced requests |
| `sync_environments` | `id`, `workspaceId`, `name`, `updatedAt` | Synced environments |
| `change_log` | `id`, `workspaceId`, `entityType`, `action`, `payload`, `timestamp` | Change tracking (3-way merge) |

### Services

| Service | Purpose |
|---|---|
| `change-log-service` | Track changes, enable 3-way merge |
| `merge-engine` | LWW + 3-way merge conflict resolution |
| `invite-service` | Workspace invitations, role management |
| `workspace-service` | Workspace CRUD, member management |

### WebSocket (Real-Time)

| Component | Purpose |
|---|---|
| `websocket-server` | Hono WebSocket handler |
| `channel-manager` | Workspace channels (isolation) |
| `message-router` | Route WS messages to handlers |
| `presence-tracker` | Track active users, send avatars |
| `ws-auth` | Token verification for WebSocket connections |

---

## Tauri Bridge (Rust)

**Minimal Rust layer — delegates to Tauri plugins.**

### Tauri Plugins Used

| Plugin | Purpose | Tauri Command |
|---|---|---|
| HTTP | Make HTTP requests (CORS bypass) | `execute_http` |
| Dialog | File picker, save dialogs | `pick_file`, `save_file` |
| Filesystem | File read/write | `read_file`, `write_file` |
| Window | Window control | Titlebar, minimize, maximize |
| Updater | Background update checks | Auto-check on startup |
| Opener | Open URLs/files in default app | `open_url` |

**Key Feature:** All HTTP requests use Tauri HTTP plugin (no browser `fetch()`). This bypasses CORS restrictions for API testing.

---

## Tech Stack Summary

### Frontend
- **Framework:** React 19 + TypeScript 5.8 + Vite
- **State:** Zustand 5 (lightweight alternative to Redux)
- **Database:** Dexie.js 4 (IndexedDB wrapper)
- **UI:** Tailwind CSS 4 + Radix UI (accessible components)
- **Code Editor:** CodeMirror 6 (syntax highlighting)
- **Scripting:** QuickJS WASM (safe JavaScript sandbox)
- **HTTP:** Tauri HTTP plugin (CORS-free)
- **Testing:** Vitest (unit), Playwright (E2E)

### Backend
- **Framework:** Hono 4 (lightweight alternative to Express)
- **Database:** PostgreSQL 15 + Drizzle ORM
- **Auth:** Firebase Admin SDK
- **Real-Time:** WebSocket (Hono ws)
- **Process:** PM2 (process manager)
- **Deploy:** Docker + Nginx (reverse proxy)

### Desktop
- **Framework:** Tauri 2 (Rust + WebView)
- **Plugins:** HTTP, Dialog, Filesystem, Window, Updater, Opener
- **Distribution:** GitHub Releases + minisign (signing)

### CI/CD
- **VCS:** GitHub
- **CI:** GitHub Actions (lint, test, type-check)
- **Release:** Multi-platform builds (Windows x64, macOS arm64, Linux x64)
- **Code Coverage:** Vitest + Playwright

---

## Testing Coverage

### Unit Tests (Vitest)
- **35 tests** covering services, utilities, stores
- Files: `tests/services/**`, `tests/utils/**`
- Run: `pnpm test`
- Coverage: Request preparer, script executor, variable interpolation, import/export

### E2E Tests (Playwright)
- **20 tests** across 5 suites
- Files: `e2e/**/*.spec.ts`
- Run: `pnpm test:e2e`
- Coverage: Send requests, create collections, manage environments, import/export, cloud sync

### Test Types
- **Smoke Tests** — Basic functionality (send request, create collection)
- **Integration Tests** — Multi-step flows (create → send → history)
- **Error Cases** — Invalid input, network errors, offline scenarios
- **Cloud Sync** — Conflict resolution, 3-way merge, WebSocket real-time

---

## Key Metrics

| Metric | Value |
|---|---|
| **Total Files** | 314 |
| **TypeScript/JavaScript** | 234 |
| **Rust** | 5 |
| **CSS/Tailwind** | 20+ |
| **Tests** | 55 (35 unit + 20 E2E) |
| **Components** | 87 |
| **Stores** | 8 |
| **Services** | 50+ |
| **Code Snippets** | 16 generators |
| **HTTP Methods** | All standard + custom |
| **Auth Types** | 5 (None, Bearer, Basic, API Key, OAuth 2.0) |
| **Body Formats** | JSON, Form Data, Multipart, Raw, XML |
| **Lines of Code** | ~19,000 |
| **Bundle Size** | ~2.5MB (minified + gzipped) |
| **Memory Usage** | ~50MB (Tauri) vs ~300MB (Electron) |
| **Startup Time** | <1s (Tauri) vs 3-5s (Electron) |

---

## Development Workflow

### Setup

```bash
# Frontend
pnpm install                          # Install dependencies
pnpm tauri dev                        # Desktop app with hot reload
pnpm dev                              # Browser-only dev (limited CORS)

# Backend (optional)
cd backend && npm install
npm run dev                           # Hono server on :3000
```

### Quality Checks

```bash
pnpm lint                             # ESLint
pnpm type-check                       # TypeScript
pnpm test                             # Vitest
pnpm test:e2e                         # Playwright
```

### Building

```bash
pnpm build                            # Frontend build
pnpm tauri build                      # Desktop build (all platforms)
pnpm build:windows                    # Windows-only
pnpm build:mac                        # macOS-only
pnpm build:linux                      # Linux-only
```

---

## Performance Characteristics

### Frontend
- **First Paint:** <500ms
- **Time to Interactive:** <1s
- **Request Send-to-Response:** <200ms (excluding network)
- **IndexedDB Query:** <50ms for 10,000 requests
- **Bundle Size:** 2.5MB (minified + gzipped)

### Offline
- **Sync Queue Flush:** <5s for 100 pending changes
- **Conflict Detection:** <100ms for 1,000 entities
- **History Prune:** Automatic (keep 1,000 latest entries)

### Real-Time (WebSocket)
- **Latency:** <200ms (presence + entity updates)
- **Reconnect:** Auto-reconnect with exponential backoff
- **Concurrent Users:** 1,000+ per workspace

---

## Key Architectural Decisions

1. **Offline-First** — IndexedDB is source of truth; cloud is optional
2. **Tauri Over Electron** — 6-10x lighter, faster startup, lower memory
3. **Zustand Over Redux** — Simpler state management, less boilerplate
4. **Dexie.js Over Raw IndexedDB** — Cleaner API, live queries, type-safe
5. **QuickJS Over Browser VM** — Safe sandbox, no DOM access, serial execution
6. **Last-Write-Wins (LWW)** — Simple conflict resolution (not always correct, but predictable)
7. **3-Way Merge (Phase 13)** — More sophisticated conflict detection (local vs. server vs. remote)
8. **WebSocket for Real-Time** — Low-latency presence + entity updates
9. **Hono Over Express** — Lightweight, TypeScript-first, edge-runtime compatible

---

## Code Quality Standards

- **Linting:** ESLint (enforce naming, imports, complexity)
- **Type-Checking:** TypeScript strict mode
- **Testing:** 80%+ coverage (unit + E2E)
- **Formatting:** Prettier (code style)
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **CI/CD:** GitHub Actions (lint, test on every push; build on tags)

See [Code Standards](./code-standards.md) for detailed conventions.

---

## References

- **[System Architecture](./system-architecture.md)** — Data flow, sync engine, component hierarchy
- **[Design Guidelines](./design-guidelines.md)** — Design tokens, component patterns, CSS conventions
- **[Code Standards](./code-standards.md)** — File naming, TypeScript, React, service patterns
- **[Development Roadmap](./development-roadmap.md)** — Phase history, timeline
- **[Project Overview & PDR](./project-overview-pdr.md)** — Vision, requirements, competitive analysis
- **[Workflow Guide](./workflow-guide.md)** — Request flow, keyboard shortcuts (Vietnamese)

---

**Document Maintainer:** Development Team
**Last Review:** 2026-03-18
