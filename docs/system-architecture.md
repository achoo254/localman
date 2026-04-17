# System Architecture

Localman is a 2-tier web application: a browser SPA (offline-first) + an optional stateless Node.js Fastify proxy.

## Overview

```
┌──────────────────────────────────────────────────┐
│               Browser SPA (React + Vite)          │
│                                                    │
│  Components (Radix UI + Tailwind)                  │
│  Zustand Stores (request, collections, settings)   │
│  Dexie.js → IndexedDB (source of truth)            │
│  Firebase JS SDK → Google sign-in, ID token        │
└──────────────────────┬───────────────────────────┘
                       │ fetch /proxy (remote targets)
                       │ direct fetch (localhost targets)
                       ▼
┌──────────────────────────────────────────────────┐
│      Fastify Proxy Backend (optional, ~150 LoC)   │
│                                                    │
│  POST /proxy → undici → target URL                 │
│  firebase-admin → verify ID token                  │
│  REQUIRE_AUTH=false → no auth, open proxy          │
└──────────────────────────────────────────────────┘
```

## Data Flow

### Offline-First Pattern
1. User action → write to IndexedDB immediately (instant UI feedback)
2. UI reflects IndexedDB state — no server round-trip for reads/writes
3. Collections, requests, environments, history all persist locally

### HTTP Request Execution
```
User clicks Send
  ↓
prepareRequest() — variable interpolation, auth headers
  ↓
Run pre-script (optional, QuickJS Worker)
  ↓
Is target URL localhost?
  ├── Yes → direct fetch()
  └── No  → POST /proxy {method, url, headers, body}
                ↓ (backend)
              undici.fetch(target) — bypasses browser CORS
                ↓
              Forward response back to SPA
  ↓
HttpResponse received
  ↓
Run post-script (optional)
  ↓
response-store updated → history logged → auto-save to IndexedDB
```

### Authentication Flow
```
User clicks "Sign in with Google"
  ↓
Firebase JS SDK → Google OAuth popup
  ↓
Firebase ID token stored in memory (never localStorage)
  ↓
Every /proxy request includes: Authorization: Bearer {idToken}
  ↓
Backend verifies token via firebase-admin (if REQUIRE_AUTH=true)
  ↓
On token expiry → Firebase SDK auto-refreshes silently
```

## Frontend Architecture

### Component Hierarchy
```
App
└── MainLayout
    ├── Titlebar (logo, auth status)
    ├── Sidebar
    │   ├── SidebarTabs (Collections, Environments, History, Docs)
    │   ├── CollectionTree (nested folders/requests)
    │   └── EnvironmentSelector
    ├── RequestPanel
    │   ├── UrlBar (method, URL, Send button)
    │   ├── RequestTabs (Params, Headers, Body, Auth)
    │   ├── CodeSnippetPanel (lazy-loaded)
    │   └── ResponsePane (status, headers, body)
    └── Toast Notifications
```

### State Management (Zustand)

| Store | Responsibility |
|-------|----------------|
| `collections-store` | CRUD collections/folders/requests |
| `request-store` | Active tab, draft management, form state |
| `response-store` | HTTP response, history |
| `settings-store` | Theme, language, preferences |
| `env-store` | Selected environment, variable sets |

### IndexedDB Schema (Dexie.js)

| Store | Key fields |
|-------|-----------|
| `collections` | id, name, description, sortOrder |
| `requests` | id, collectionId, folderId, method, url, headers, body, auth |
| `environments` | id, name, variables, isActive |
| `history` | id, requestId, response, executedAt |
| `settings` | key, value |

## Backend Architecture

### Fastify Proxy (~150 LoC, stateless)

**Entry:** `backend/src/index.ts` — registers plugins, starts server

**Routes:**
- `GET /health` → `{ status: "ok" }`
- `POST /proxy` → forward request to target URL via undici

**Auth middleware** (`backend/src/auth.ts`):
- Extracts `Authorization: Bearer {token}` header
- Verifies via `firebase-admin.auth().verifyIdToken()`
- Short-circuits with 401 if invalid (when `REQUIRE_AUTH=true`)
- Skipped entirely when `REQUIRE_AUTH=false`

**Proxy handler** (`backend/src/proxy.ts`):
- Accepts `{ method, url, headers, body }` from SPA
- Forwards via `undici.fetch()` — no CORS constraints server-side
- Streams response back (status, headers, body)
- No data persistence — purely stateless

### Middleware Stack
```
Request
  ↓ CORS check (ALLOWED_ORIGINS)
  ↓ Auth guard (if REQUIRE_AUTH=true)
  ↓ Route handler (/proxy)
  ↓
Response
  ↓ Error handler (JSON { error, message })
```

## Security

### Frontend
- ID tokens: memory only (never localStorage/IndexedDB)
- Script sandbox: QuickJS in Worker (isolated, no DOM access)
- No secrets in Vite build output (VITE_* vars are public — only non-sensitive Firebase config)

### Backend
- Firebase token verification on every proxied request (when auth enabled)
- CORS: `ALLOWED_ORIGINS` env var restricts allowed FE origins
- No database — no SQL injection surface
- `undici` follows redirects but strips auth headers on redirect by default

## Performance

- IndexedDB indexes on `collectionId`, `updatedAt` for fast queries
- Lazy loading: snippet panel, docs viewer loaded on demand
- Variable interpolation: cached per-render, recalculated only on change
- Bundle: Vite tree-shaking + minification, ~2MB gzipped estimate

## Error Handling

### Frontend
- Error boundaries wrap major panels (request, response, sidebar)
- Network errors: shown in response pane with status indicator
- IndexedDB quota errors: toast notification with recovery suggestion
- Script errors: caught in Worker, displayed in script output panel

### Backend
- All route errors caught, formatted as `{ error: string, message: string }`
- HTTP 401 on auth failure, 502 on upstream unreachable, 500 on unexpected error
- No silent failures — all undici errors propagate to response

## Extensibility

### Adding a Code Snippet Language
1. Create `src/services/snippet-generators/generator-{lang}.ts`
2. Export `(req: PreparedRequest) => string`
3. Register in `snippet-generator-registry.ts`

### Adding a New Zustand Store
1. Create `src/stores/{feature}-store.ts`
2. Define state + actions, export `use{Feature}Store()`
3. Use in components via hook

## Known Limitations

1. **IndexedDB quota** — ~50–500MB depending on browser/OS; large response bodies inflate history fast
2. **Proxy required for CORS** — localhost-only APIs work without BE, but all remote APIs need the Fastify proxy running
3. **No offline proxy** — if BE is down, remote API calls fail (by design; local calls still work)
4. **Single-user** — no team collaboration or cloud sync in current scope
