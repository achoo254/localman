# Codebase Summary

High-level overview of Localman's directory structure, key modules, and architecture.

## Directory Structure

```
localman/
├── backend/                   # Backend API server (NEW — Phase 13)
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   │   ├── health.ts     # GET /api/health
│   │   │   └── sync.ts       # Sync endpoints (pull/push)
│   │   ├── middleware/       # Express/Hono middleware
│   │   │   ├── auth-guard.ts # JWT authentication
│   │   │   └── error-handler.ts
│   │   ├── db/               # Database layer
│   │   │   ├── schema.ts     # Drizzle ORM schema (sync, users)
│   │   │   ├── auth-schema.ts # Better Auth schema
│   │   │   └── client.ts     # PostgreSQL client
│   │   ├── types/            # TypeScript types
│   │   │   └── context.ts    # Request context, auth user
│   │   ├── app.ts            # Hono app setup
│   │   ├── auth.ts           # Better Auth config
│   │   ├── env.ts            # Environment variable validation
│   │   └── index.ts          # Server entry point
│   ├── drizzle.config.ts     # Drizzle migration config
│   ├── package.json          # Backend dependencies
│   ├── tsconfig.json         # TypeScript config
│   └── .env.example          # Environment template
├── src/                       # Frontend React app
│   ├── components/           # React UI components
│   │   ├── collections/      # Collection tree, sidebar, context menu
│   │   ├── request/          # Request builder, URL bar, tabs, auth, body, etc.
│   │   ├── common/           # Shared UI components (key-value editor, syntax input)
│   │   ├── docs/             # API docs viewer, TOC, request cards
│   │   ├── settings/         # Settings/preferences, cloud sync login form
│   │   ├── layout/           # Main layout, titlebar, sidebar
│   │   └── (individual .tsx files for features)
│   ├── stores/               # Zustand state management
│   │   ├── collections-store.ts
│   │   ├── request-store.ts
│   │   ├── settings-store.ts
│   │   ├── sync-store.ts     # Cloud sync state (NEW)
│   │   └── (other stores)
│   ├── services/             # Business logic, HTTP client, utilities
│   │   ├── snippet-generators/       # 16 code snippet generators
│   │   ├── sync/                     # Cloud sync services (NEW)
│   │   │   ├── cloud-auth-client.ts  # Better Auth client wrapper
│   │   │   └── cloud-sync-service.ts # Pull/push sync with backend
│   │   ├── docs-export-service.ts    # HTML + Markdown export
│   │   ├── request-preparer.ts       # Variable interpolation, auth setup
│   │   ├── import-export-service.ts  # cURL, Postman, OpenAPI import/export
│   │   ├── http-client.ts            # Tauri HTTP plugin wrapper
│   │   ├── script-executor.ts        # QuickJS sandbox, pre/post scripts
│   │   └── (other services)
│   ├── db/                   # Dexie.js IndexedDB layer
│   │   └── database.ts       # Schema, stores, migrations
│   ├── types/                # TypeScript type definitions
│   │   ├── models.ts         # ApiRequest, Collection, Environment, etc.
│   │   ├── response.ts       # PreparedRequest, HttpResponse, etc.
│   │   ├── cloud-sync.ts     # Cloud sync types (NEW)
│   │   ├── settings.ts       # Settings types
│   │   └── (other types)
│   ├── utils/                # Utility functions
│   │   ├── variable-interpolation.ts
│   │   ├── tauri-http-client.ts  # Tauri HTTP wrapper (NEW)
│   │   ├── clipboard.ts
│   │   ├── format.ts
│   │   └── (other utilities)
│   ├── index.css             # Global styles (Tailwind)
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
├── src-tauri/                # Rust/Tauri backend
│   ├── src/
│   │   └── lib.rs            # Tauri commands (file dialogs, HTTP, etc.)
│   ├── tauri.conf.json       # Tauri config (window, features, permissions)
│   └── Cargo.toml
├── public/                   # Static assets
├── tests/                    # Vitest unit tests
├── e2e/                      # Playwright E2E tests
├── docs/                     # Project documentation
├── plans/                    # Development plans and phase docs
├── package.json              # Frontend + workspace root dependencies
├── pnpm-workspace.yaml       # pnpm workspace config (monorepo)
├── tsconfig.json             # TypeScript config (shared)
├── tailwind.config.js        # Tailwind CSS config
├── vite.config.ts            # Vite config (frontend)
└── README.md                 # Project overview
```

## Key Modules

### Services (`src/services/`)

#### Snippet Generators (`snippet-generators/`)
- **Pattern**: Plugin-based architecture
- **Input**: `PreparedRequest` (resolved request with interpolated variables)
- **Output**: String of code in target language
- **16 Languages**: cURL, JavaScript (fetch/axios), Python, Go, Java (2 variants), PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie
- **File Size**: Each generator < 100 lines, pure functions

#### Docs Export Service
- `exportCollectionAsMarkdown(collection, requests)` → string (Markdown)
- `exportCollectionAsHtml(collection, requests)` → string (HTML with inline CSS)
- Formats request cards with method badge, URL, description, headers, params

#### Request Preparer (`request-preparer.ts`)
- Resolves variables in URL, headers, body, auth
- Returns `PreparedRequest` with clean, executable data
- Reused by snippet generators and HTTP client

#### Import/Export Service (`import-export-service.ts`)
- Import: cURL, Postman v2.1, OpenAPI 3.0 → collections/requests
- Export: requests → cURL format
- Validation and error handling

#### HTTP Client (`http-client.ts`)
- Wrapper around Tauri HTTP plugin
- Executes prepared requests with headers, body, auth
- Returns `HttpResponse` with status, headers, body, timing

#### Script Executor (`script-executor.ts`)
- QuickJS sandbox in Web Worker
- Executes pre/post request scripts
- Variable interpolation context available
- Serial queue (one script at a time)

#### Cloud Sync Services (`services/sync/`)
- **Cloud Auth Client** (`cloud-auth-client.ts`) — Better Auth wrapper for login, logout, session management
- **Cloud Sync Service** (`cloud-sync-service.ts`) — Pull/push collections to backend API
  - POST /api/sync/pull — fetch remote collections
  - POST /api/sync/push — upload local changes
  - Last-Write-Wins conflict resolution by `updated_at`
  - Supports both legacy (offline-only) and cloud sync modes

### Components (`src/components/`)

#### Request (`request/`)
- `request-panel.tsx` — main request editor, draft/save integration
- `url-bar.tsx` — method + URL input + send button + snippet toggle (`</>`) + Ctrl+S save
- `request-tabs.tsx` — params, headers, body, auth tabs
- `params-tab.tsx` — URL query parameters
- `headers-tab.tsx` — HTTP headers
- `body-tab.tsx` — request body (JSON, form, raw)
- `auth-tab.tsx` — auth configuration
- `code-snippet-panel.tsx` — syntax-highlighted snippet display
- `request-description-editor.tsx` — markdown description editor
- `save-request-dialog.tsx` — dialog for saving drafts to collection (NEW)
- `request-tab-bar.tsx` — tab list with italic styling for drafts, close confirmation

#### Collections (`collections/`)
- `collection-tree.tsx` — nested folder/request tree
- `collection-item.tsx` — collection node in sidebar
- `folder-item.tsx` — folder node in tree
- `request-item.tsx` — request node in tree
- `collection-context-menu.tsx` — context menu (create, rename, delete)
- `sidebar-tabs.tsx` — tab selector (Collections, Environments, History, Docs)

#### Docs (`docs/`) — NEW
- `docs-viewer-page.tsx` — main docs page (collection selector, TOC + content)
- `docs-request-card.tsx` — individual request card (method, URL, description, headers)
- `docs-table-of-contents.tsx` — TOC sidebar with anchor links

#### Common (`common/`)
- `key-value-editor.tsx` — reusable key-value table (headers, params, etc.)
- `variable-highlight-input.tsx` — URL/text input with variable highlighting

#### Settings (`settings/`)
- `general-settings.tsx` — app preferences

#### Layout (`layout/`)
- `main-layout.tsx` — overall app shell
- `titlebar.tsx` — window title and controls
- `sidebar.tsx` — left sidebar with tabs

### Stores (`src/stores/`)

**Zustand State Management**

- `collections-store.ts` — collections, folders, requests (CRUD)
- `request-store.ts` — active request, tabs, form state, draft requests
  - `openTabs: TabInfo[]` — list of open tabs with `isDraft` flag
  - `drafts: Record<string, ApiRequest>` — in-memory draft requests (not persisted until save)
  - `createDraftTab()` — create transient draft (Ctrl+T)
  - `saveDraftToCollection()` — persist draft to IndexedDB, close draft tab
- `settings-store.ts` — user preferences, theme, last selected language
- Other domain-specific stores

### Types (`src/types/`)

#### Core Models (`models.ts`)
- `ApiRequest` — individual request (method, url, headers, body, auth, description)
- `Collection` — folder/collection (name, description, requests)
- `ApiFolder` — nested folder structure
- `Environment` — variable set (variables map)
- `RequestHistory` — logged execution (request, response, timing)

#### Response Types (`response.ts`)
- `PreparedRequest` — resolved request ready for execution
- `HttpResponse` — API response (status, headers, body, timing)
- `HttpError` — error details

#### Settings Types (`settings.ts`)
- Theme, language, sync preferences
- Persisted in IndexedDB `settings` store

### Database (`src/db/`)

**Dexie.js IndexedDB Schema**

| Store | Purpose |
|-------|---------|
| `collections` | API request groups, nested folders |
| `requests` | Individual API requests with full metadata |
| `environments` | Env variable sets (Dev/Staging/Prod) |
| `history` | Auto-logged request executions |
| `settings` | User preferences, encrypted refresh token |

**Schema Versioning**: Bumped to v2 for Phase 11 (description field addition)

### Utilities (`src/utils/`)

- `variable-interpolation.ts` — `{{varName}}` replacement, dynamic vars (`$guid`, `$timestamp`, etc.)
- `clipboard.ts` — copy-to-clipboard with fallback
- `format.ts` — syntax highlighting, code formatting
- Other helpers (validation, date formatting, etc.)

## Data Flow

### Draft Tab Creation & Save
```
User presses Ctrl+T or clicks "New Request" context menu
  ↓
createDraftTab() creates in-memory draft (draft_UUID)
  ↓
Draft stored in useRequestStore.drafts record (NOT IndexedDB)
  ↓
Tab opened with isDraft: true (italic styling)
  ↓
User modifies draft (auto-save skipped)
  ↓
User presses Ctrl+S
  ↓
SaveRequestDialog opens with collection/folder selector
  ↓
User confirms name and destination
  ↓
saveDraftToCollection() persists to IndexedDB
  ↓
Draft removed from memory, tab marked as saved (isDraft: false)
  ↓
Next saves use normal auto-save flow
```

### Request Execution
```
User fills request form
  ↓
Click Send
  ↓
prepareRequest() → PreparedRequest (variables interpolated)
  ↓
Run pre-script (optional)
  ↓
http-client.execute() → HttpResponse
  ↓
Run post-script (optional)
  ↓
Display response + log to history (skip if draft)
  ↓
Auto-save to IndexedDB (skip if draft)
```

### Code Snippet Generation
```
User clicks </> button
  ↓
Code Snippet Panel opens
  ↓
prepareRequest() → PreparedRequest
  ↓
snippetGenerator(prepared, selectedLanguage) → string
  ↓
Display in read-only CodeMirror
  ↓
User copies or changes language
```

### API Docs Export
```
User opens Docs viewer
  ↓
Select collection
  ↓
Render request cards with descriptions
  ↓
User clicks Export
  ↓
exportCollectionAsHtml() or exportCollectionAsMarkdown() → string
  ↓
Tauri save dialog
  ↓
File saved to user's filesystem
```

## Architecture Patterns

### Plugin Pattern (Snippet Generators)
Each generator is a standalone function registered in `snippet-generator-registry.ts`. New languages can be added by:
1. Create `generator-{lang}.ts` with `(req: PreparedRequest) => string`
2. Register in registry's `SNIPPET_LANGUAGES` and `generators` map
3. No other changes needed

### Store Pattern (Zustand)
Lightweight state management with minimal boilerplate. Stores are action-focused (not reducers).

### Service Layer
Business logic separated from UI. Services are stateless, reusable across components.

### Type Safety
Full TypeScript coverage. `tsconfig.json` with strict mode enabled.

## Build & Deployment

- **Frontend**: Vite + React + TypeScript
- **Desktop**: Tauri (Rust) wraps Vite build
- **Build**: `pnpm build` (frontend), `pnpm tauri build` (full desktop app)
- **CI/CD**: GitLab (lint, test, Windows MSI/EXE on tags `v*`)

## Development Commands

```bash
pnpm install              # Install deps
pnpm tauri dev            # Dev server + Tauri window
pnpm dev                  # Vite dev only (browser)
pnpm build                # Build frontend
pnpm tauri build          # Build desktop app (all platforms)
pnpm lint                 # ESLint
pnpm type-check           # TypeScript check
pnpm test                 # Vitest unit tests
pnpm test:e2e             # Playwright E2E
```

## Backend Architecture (Phase 13 — NEW)

### Technology Stack
- **Framework**: Hono v4 (lightweight, edge-first)
- **Runtime**: Node.js (@hono/node-server)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth (account/session/OAuth)
- **Deployment**: PM2 + systemd + Nginx reverse proxy

### Database Schema

#### Collections & Sync
| Table | Purpose |
|-------|---------|
| `sync_collections` | Synced collections from desktop (id, userId, name, description, metadata, updatedAt) |
| `sync_requests` | Synced requests (id, collectionId, method, url, headers, body, auth, etc.) |
| `sync_history` | Execution history (optional, for later phases) |

#### Authentication (Better Auth)
| Tables | Purpose |
|--------|---------|
| `account`, `session`, `user`, `verification` | Better Auth built-in tables |
| `user_settings` | User preferences (sync mode, theme, etc.) |

### API Endpoints

#### Health Check
```
GET /api/health
Response: { status: "ok" }
```

#### Sync Endpoints (Authenticated)
```
POST /api/sync/pull
Body: { since?: number }
Response: { collections, requests, updatedAt }

POST /api/sync/push
Body: { collections, requests, deletions }
Response: { success: true, syncedAt }
```

#### Authentication (Better Auth)
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/session
GET /api/auth/signin/github  (or other OAuth providers)
```

### Middleware
- **Error Handler**: Catches all errors, returns consistent `{ error, code, details }` JSON
- **Auth Guard**: Validates JWT token, attaches user to request context
- **CORS**: Allows localhost + Tauri webview origins

### Deployment Pattern
1. **Development**: `npm run dev` (Hono dev server on port 3000)
2. **Production**:
   - Build: `npm run build` (compile TypeScript)
   - PM2 start: `pm2 start dist/index.js --name localman-api`
   - Systemd service (optional): Auto-restart PM2 on system reboot
   - Nginx: Reverse proxy to PM2, TLS termination, static file serving
   - PostgreSQL: Cloud-hosted or local Docker

### Integration with Frontend

**Desktop Sync Mode** (new in Phase 13)
- User logs in via `CloudLoginForm` component
- Better Auth session stored in IndexedDB `settings` store
- `CloudSyncService` periodically pulls/pushes changes
- Fallback to offline-only mode if backend is unavailable

**API Contract**
- All sync requests include `Authorization: Bearer {access_token}`
- Requests must validate collection ownership (userId)
- 409 Conflict response on push with stale `updatedAt` (client retries)

## Key Insights

1. **Offline-First**: IndexedDB is source of truth. API is optional. ✅
2. **Zero Dependencies at Build Time**: Minimal npm packages, focus on native APIs.
3. **Type Safety**: Full TypeScript strict mode, no `any` usage.
4. **Lazy Loading**: Heavy components (docs viewer, snippet panel) lazy-loaded to reduce initial bundle.
5. **Reuse**: `PreparedRequest` used by HTTP client, snippet generators, and script executor.
6. **Extensible**: Plugin pattern for snippet generators makes adding new languages frictionless.

## Phase 13 Additions (Cloud Sync Phase 2) — NEW

### New Backend (`backend/` directory)
- **Backend App** (`src/app.ts`, `src/index.ts`) — Hono server setup + route mounting
- **Database Layer**:
  - `src/db/schema.ts` — Drizzle sync collections/requests schema
  - `src/db/auth-schema.ts` — Better Auth schema
  - `src/db/client.ts` — PostgreSQL connection
- **Routes**:
  - `src/routes/health.ts` — GET /api/health endpoint
  - `src/routes/sync.ts` — POST /api/sync/pull, POST /api/sync/push endpoints
- **Authentication**:
  - `src/auth.ts` — Better Auth configuration
  - `src/middleware/auth-guard.ts` — JWT token validation middleware
- **Middleware**:
  - `src/middleware/error-handler.ts` — Error handling + JSON response formatting
- **Configuration**:
  - `src/env.ts` — Environment variable schema validation
  - `src/types/context.ts` — Request context + auth user type
  - `drizzle.config.ts` — Drizzle migration configuration

### New Frontend Files
- **Cloud Sync Services** (`src/services/sync/`):
  - `cloud-auth-client.ts` — Better Auth client wrapper (login, logout, getSession)
  - `cloud-sync-service.ts` — Pull/push sync logic with conflict resolution
- **Cloud Login UI** (`src/components/settings/cloud-login-form.tsx`) — Login/logout form
- **Cloud Sync Types** (`src/types/cloud-sync.ts`) — CloudSyncCollection, CloudSyncRequest types
- **HTTP Utilities** (`src/utils/tauri-http-client.ts`) — Tauri HTTP wrapper for cloud requests

### Modified Frontend Files
- `src/stores/sync-store.ts` — support cloud + legacy sync modes
- `src/components/settings/sync-settings.tsx` — cloud login UI integration
- `package.json` — new `backend` workspace in pnpm
- `pnpm-workspace.yaml` — monorepo configuration

## Phase 12 Additions

### New Files (1 total)
- **Save Request Dialog** (`src/components/request/save-request-dialog.tsx`): Draft save UI

### Modified Files
- `src/stores/request-store.ts` — draft management system
- `src/hooks/use-auto-save.ts` — skip auto-save for drafts
- `src/stores/response-store.ts` — skip history logging for drafts
- `src/components/request/request-panel.tsx` — integrate save dialog
- `src/components/request/request-tab-bar.tsx` — draft tab styling
- `src/components/request/url-bar.tsx` — Ctrl+S handler
- `src/components/collections/sidebar-tabs.tsx` — new request context menu
- `src/App.tsx` — global Ctrl+T handler

## Phase 11 Additions

### New Files (18 total)
- **Snippet Generators** (`src/services/snippet-generators/`): 16 language generators + registry
- **Export Service** (`src/services/docs-export-service.ts`): HTML/Markdown export
- **Docs Components** (`src/components/docs/`): Viewer page, request card, TOC
- **Snippet UI** (`src/components/request/code-snippet-panel.tsx`): Snippet display + language selector
- **Description Editor** (`src/components/request/request-description-editor.tsx`): Markdown editor

### Modified Files
- `src/types/models.ts` — added `description` field to `ApiRequest`
- `src/db/database.ts` — bumped Dexie version
- `src/components/request/url-bar.tsx` — added `</>` toggle button
- `src/components/request/request-panel.tsx` — integrated snippet + description
- `src/components/collections/sidebar-tabs.tsx` — added Docs tab
- `package.json` — added `react-markdown`

## Unresolved Questions

None at this time.
