# Codebase Summary

High-level overview of Localman's directory structure, key modules, and architecture (web-only, post-simplification).

## Directory Structure

```
localman/
├── backend/                   # Fastify proxy backend (~150 LoC, stateless)
│   ├── src/
│   │   ├── index.ts           # Server entry — registers plugins, starts Fastify
│   │   ├── auth.ts            # Firebase token verification middleware
│   │   └── proxy.ts           # POST /proxy — CORS-bypass request forwarder (undici)
│   ├── Dockerfile             # node:22-alpine image
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── src/                       # Frontend React SPA
│   ├── components/            # React UI components
│   │   ├── collections/       # Collection tree, sidebar, context menu
│   │   ├── request/           # Request builder, URL bar, tabs, auth, body
│   │   ├── common/            # Shared UI (key-value editor, syntax input, error boundary)
│   │   ├── docs/              # API docs viewer, TOC, request cards
│   │   ├── settings/          # Settings pages, auth login form
│   │   └── layout/            # Main layout, titlebar, sidebar
│   ├── stores/                # Zustand state management
│   │   ├── collections-store.ts
│   │   ├── request-store.ts
│   │   ├── response-store.ts
│   │   ├── settings-store.ts
│   │   └── env-store.ts
│   ├── services/              # Business logic, HTTP client, utilities
│   │   ├── snippet-generators/        # 16 code snippet generators + registry
│   │   ├── docs-export-service.ts     # HTML + Markdown export
│   │   ├── request-preparer.ts        # Variable interpolation, auth setup
│   │   ├── import-export-service.ts   # cURL, Postman, OpenAPI import/export
│   │   ├── http-client.ts             # fetch wrapper (direct or via /proxy)
│   │   └── script-executor.ts         # QuickJS sandbox, pre/post scripts
│   ├── db/                    # Dexie.js IndexedDB layer
│   │   ├── database.ts        # Schema, stores, migrations
│   │   └── services/
│   │       └── draft-service.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── models.ts          # ApiRequest, Collection, Environment, etc.
│   │   ├── response.ts        # PreparedRequest, HttpResponse, HttpError
│   │   └── settings.ts        # Settings types
│   ├── utils/                 # Utility functions
│   │   ├── variable-interpolation.ts
│   │   ├── api-base-url.ts    # Resolve proxy vs direct URL
│   │   ├── clipboard.ts
│   │   ├── format.ts
│   │   ├── db-error-handler.ts
│   │   └── feature-flags.ts
│   ├── firebase-config.ts     # Firebase JS SDK initialization
│   ├── App.tsx                # Root component, global keyboard handlers
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles (Tailwind)
├── tests/                     # Vitest unit tests
├── docs/                      # Project documentation
├── plans/                     # Development plans and phase files
│   └── dattqh/                # Current active plans
├── public/                    # Static assets
├── package.json               # Root + frontend dependencies
├── pnpm-workspace.yaml        # pnpm monorepo (packages: backend)
├── tsconfig.json              # TypeScript config (shared)
├── tailwind.config.js         # Tailwind CSS config
├── vite.config.ts             # Vite config (frontend)
└── .github/workflows/         # CI: lint + type-check + test on every push
```

## Key Modules

### Services (`src/services/`)

#### HTTP Client (`http-client.ts`)
- Determines if target URL is localhost (direct fetch) or remote (via `/proxy`)
- Returns `HttpResponse` with status, headers, body, timing
- Throws `HttpClientError` on network failure

#### Request Preparer (`request-preparer.ts`)
- Resolves `{{variables}}` in URL, headers, body, auth
- Returns `PreparedRequest` — used by HTTP client, snippet generators, script executor

#### Snippet Generators (`snippet-generators/`)
- 16 languages: cURL, JS (fetch/axios), Python, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie
- Plugin pattern: each generator is `(req: PreparedRequest) => string`, registered in registry
- Adding new language: create `generator-{lang}.ts`, register in registry — no other changes

#### Import/Export Service (`import-export-service.ts`)
- Import: cURL, Postman v2.1, OpenAPI 3.0 → collections/requests
- Export: requests → cURL string

#### Script Executor (`script-executor.ts`)
- QuickJS WASM sandbox in Web Worker
- Serial queue — one script at a time, no concurrent execution
- Pre/post script context includes `pm` object (environment get/set)

### Stores (`src/stores/`)

| Store | Responsibility |
|-------|----------------|
| `collections-store` | CRUD collections/folders/requests, IndexedDB sync |
| `request-store` | Active tab, draft management (`isDraft` flag), form state |
| `response-store` | HTTP response, history logging, cancel/timeout |
| `settings-store` | Theme, language, history retention |
| `env-store` | Active environment, variable resolution |

### Database (`src/db/`)

**Dexie.js IndexedDB Schema (v4)**

| Store | Purpose |
|-------|---------|
| `collections` | API request groups, nested folders |
| `requests` | Individual API requests with full metadata |
| `environments` | Variable sets (Dev/Staging/Prod) |
| `history` | Auto-logged request executions |
| `settings` | User preferences |
| `drafts` | Unsaved draft requests (in-memory, persisted to IDB as backup) |

### Backend (`backend/src/`)

| File | Purpose |
|------|---------|
| `index.ts` | Fastify server: register CORS, auth plugin, routes; start listener |
| `auth.ts` | Fastify plugin: verify Firebase ID token from `Authorization` header |
| `proxy.ts` | Route handler: `POST /proxy` — forward request via undici, stream response |

## Data Flow

### Request Execution
```
User clicks Send
  → prepareRequest() (variables interpolated)
  → pre-script (optional, QuickJS)
  → http-client: localhost? direct fetch : POST /proxy
  → response-store updated
  → post-script (optional)
  → history logged to IndexedDB (skip if draft)
  → auto-save to IndexedDB (skip if draft)
```

### Draft Tab Lifecycle
```
Ctrl+T → createDraftTab() → in-memory draft (not IndexedDB)
  → user edits (no auto-save)
  → Ctrl+S → SaveRequestDialog → saveDraftToCollection() → IndexedDB
  → tab marked saved (isDraft: false), normal auto-save resumes
```

## Architecture Patterns

- **Offline-First:** IndexedDB is always source of truth; API proxy is stateless and optional
- **Plugin Pattern:** Snippet generators — pure functions registered in a registry
- **Store Pattern:** Zustand stores are action-focused; services are called from stores, not components
- **Service Layer:** Business logic separated from UI; services are stateless and testable
- **Type Safety:** Strict TypeScript throughout; no `any` without explicit justification

## Build & CI

- **Frontend:** `pnpm build` → Vite bundles to `dist/`
- **Backend:** `pnpm --filter backend build` → `tsc` compiles to `backend/dist/`
- **CI:** GitHub Actions (`.github/workflows/`) — `node:22-alpine`, runs lint + type-check + test (FE + BE) on every push
