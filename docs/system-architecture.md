# System Architecture

High-level architecture of Localman: a distributed offline-first API client with cloud sync capabilities.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Localman Desktop App                     │
│               (Tauri + React + TypeScript)                   │
├─────────────────────────────────────────────────────────────┤
│                    Frontend Layer (React)                     │
│  Components | Stores (Zustand) | Services | Utils            │
├─────────────────────────────────────────────────────────────┤
│               Local Storage Layer (IndexedDB)                │
│  Collections | Requests | Environments | History | Settings  │
├─────────────────────────────────────────────────────────────┤
│                  Tauri Desktop Bridge                         │
│   (HTTP client, file dialogs, window controls)              │
└─────────────────────────────────────────────────────────────┘
              ↓ (HTTPS) ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Server                          │
│             (Node.js + Hono + PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│                  API Routes (Hono)                            │
│  Health | Auth (Better Auth) | Sync (pull/push)             │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (Drizzle)                     │
│  sync_collections | sync_requests | user | session          │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL (Cloud or Local)                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Offline-First Pattern

1. **User Action** (create/modify request)
   - Write to IndexedDB immediately (instant UI feedback)
   - Auto-save fires on changes
   - Request ready for execution without network

2. **Execution**
   - User clicks Send
   - Request prepared: variables interpolated, auth headers added
   - Tauri HTTP plugin executes (bypasses browser CORS)
   - Response logged to history
   - Auto-saved if not a draft

3. **Cloud Sync** (when enabled and online)
   - Frontend polls or user initiates sync
   - CloudSyncService compares local vs. remote
   - Push: Send local changes (POST /api/sync/push)
   - Pull: Fetch remote updates (POST /api/sync/pull)
   - Conflict resolution: Last-Write-Wins by `updated_at`
   - Merge results into IndexedDB

### Sync Mode Decision

```
┌─ User Settings ─┐
│  Sync Mode      │
└────────────────┘
      ↓
   ┌─ Offline ─┐  ┌─ Cloud ─┐
   │           │  │         │
   No backend  │  Need login
   (fallback)  │  & HTTPS
               │
        IndexedDB only
```

## Frontend Architecture

### Component Hierarchy

```
App
├── MainLayout
│   ├── Titlebar (logo, sync status, window controls)
│   ├── Sidebar
│   │   ├── SidebarTabs (Collections, Environments, History, Docs)
│   │   ├── CollectionTree (if Collections tab active)
│   │   │   └── RequestItem / FolderItem (recursive)
│   │   └── EnvironmentSelector (if Environments tab active)
│   ├── RequestPanel
│   │   ├── UrlBar (method, URL, Send button, Snippet toggle)
│   │   ├── RequestTabs (Params, Headers, Body, Auth, Description)
│   │   ├── CodeSnippetPanel (lazy-loaded, language selector)
│   │   └── ResponsePane (status, headers, body with syntax highlight)
│   ├── SaveRequestDialog (draft save UI, modal)
│   └── CloudLoginForm (settings, login/logout)
└── Toast Notifications
```

### State Management (Zustand)

| Store | Responsibility |
|-------|-----------------|
| `collections-store` | CRUD collections/folders/requests |
| `request-store` | Active tab, draft management, form state |
| `response-store` | HTTP response, history |
| `settings-store` | Theme, language, sync preferences |
| `sync-store` | Sync mode, cloud session, pull/push status |
| `env-store` | Selected environment, variable overrides |

### Data Flow Examples

#### Creating a Request
```
User presses Ctrl+T
  ↓
App.tsx global handler
  ↓
createDraftTab() in request-store
  ↓
Draft created in memory (drafts record)
  ↓
UI re-renders, new tab visible (italic = draft)
  ↓
User types URL, headers, body (stays in memory)
  ↓
User presses Ctrl+S
  ↓
SaveRequestDialog opens
  ↓
User confirms name + collection
  ↓
saveDraftToCollection() → IndexedDB
  ↓
Draft removed from memory
  ↓
Tab marked as saved (isDraft: false)
```

#### Executing a Request
```
User fills form + clicks Send
  ↓
prepareRequest() (variable interpolation)
  ↓
Run pre-script (optional, QuickJS)
  ↓
http-client.execute() via Tauri HTTP plugin
  ↓
HttpResponse received
  ↓
Run post-script (optional)
  ↓
response-store updated
  ↓
history logged (if not draft)
  ↓
UI displays response (syntax highlighted)
  ↓
Auto-save (if not draft)
```

#### Cloud Sync (Pull)
```
User enables cloud sync + logs in
  ↓
CloudAuthClient.login() → Better Auth session
  ↓
User clicks "Sync" or auto-sync triggers
  ↓
CloudSyncService.pull()
  ↓
POST /api/sync/pull { since: localUpdateTime }
  ↓
Backend returns { collections, requests }
  ↓
Frontend merges:
  - For each remote collection:
    - Local exists? Compare updatedAt
    - Remote newer? Update local
    - Conflict? Keep local (LWW rule)
  - Add new remote items
  ↓
collections-store updated
  ↓
Sync UI shows "Last synced: 2 min ago"
```

## Backend Architecture

### Route Handlers

#### Health
```
GET /api/health
→ { status: "ok" }
```

#### Authentication (Better Auth)
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/session
GET  /api/auth/signin/github
(OAuth providers configurable)
```

#### Sync Endpoints (Authenticated)
```
POST /api/sync/pull
Headers: Authorization: Bearer {token}
Body: { since?: number }
Response: {
  collections: [{ id, userId, name, description, updatedAt, ... }],
  requests: [{ id, collectionId, method, url, headers, body, ... }],
  updatedAt: number
}

POST /api/sync/push
Headers: Authorization: Bearer {token}
Body: {
  collections: [...],
  requests: [...],
  deletions: { collectionIds: [], requestIds: [] }
}
Response: {
  success: true,
  syncedAt: number,
  conflicts?: [{ type: 'collection'|'request', id, remoteUpdatedAt }]
}
```

### Middleware Stack

```
Request
  ↓ (CORS check)
  ↓ (Error handler wrapper)
  ↓ (Auth guard for protected routes)
  ↓ (Route handler)
  ↓
Response (JSON)
  ↓
Error Handler (catches all errors, formats JSON)
```

### Database Schema (Drizzle)

#### Sync Collections Table
```sql
CREATE TABLE sync_collections (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL,  -- Link to Better Auth user
  name VARCHAR NOT NULL,
  description TEXT,
  metadata JSON,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

#### Sync Requests Table
```sql
CREATE TABLE sync_requests (
  id VARCHAR PRIMARY KEY,
  collectionId VARCHAR NOT NULL,
  method VARCHAR,  -- GET, POST, etc.
  url VARCHAR,
  headers JSON,
  body TEXT,
  auth JSON,
  description TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (collectionId) REFERENCES sync_collections(id)
);
```

#### Better Auth Tables (auto-managed)
```sql
-- user, account, session, verification, etc.
-- See Better Auth docs for full schema
```

### Deployment

```
┌─ Local Development
│  npm run dev → Hono dev server on :3000
│  PostgreSQL local or Docker
│
├─ Staging
│  Build: npm run build
│  PM2: pm2 start dist/index.js
│  PostgreSQL: Cloud-hosted (e.g., AWS RDS)
│  Nginx reverse proxy + TLS
│
└─ Production
   Same as staging
   PM2 systemd integration for auto-restart
   Monitoring: PM2 monitoring dashboard
   Backups: PostgreSQL scheduled backups
```

## Deployment Architecture

### Frontend (Tauri Desktop)
- Platform-specific builds (Windows MSI, macOS DMG, Linux AppImage)
- Auto-updates via Tauri bundler (GitHub releases)
- Offline-capable (IndexedDB persists all data locally)

### Backend (Node.js)
- Docker container (optional)
- PM2 process manager with systemd integration
- Nginx reverse proxy (SSL/TLS, static file serving, load balancing)
- PostgreSQL database (managed or self-hosted)
- Optional: Kubernetes (scale horizontally for future multi-region)

## Security Considerations

### Frontend
- Access tokens: Memory only (never localStorage)
- Refresh tokens: IndexedDB (encrypted at rest if possible)
- CORS: Desktop WebView origin allowed
- Script sandbox: QuickJS in Worker (prevents XSS)

### Backend
- JWT validation on protected routes (auth guard middleware)
- User isolation: All queries filtered by `userId`
- Rate limiting: Optional (via Hono middleware)
- HTTPS only (TLS termination at Nginx)
- Database: Parameterized queries (Drizzle prevents SQL injection)

## Performance Considerations

### Frontend
- Lazy loading: Components loaded on-demand (docs viewer, snippet panel)
- IndexedDB indexes: Fast queries on `collectionId`, `userId`, etc.
- Variable interpolation: Cached and only recalculated on change
- Syntax highlighting: CodeMirror virtualization for large responses
- Bundle: Minified, tree-shaken, ~2MB gzipped

### Backend
- Connection pooling: Drizzle manages PostgreSQL pool
- Caching: Optional Redis for session/token validation
- Pagination: Sync endpoints support `limit` + `offset`
- Compression: Nginx gzip for responses > 1KB

## Error Handling

### Frontend
- Error boundaries catch React errors, display fallback UI
- Network errors: Fallback to offline mode
- IndexedDB errors: User notified, suggest recovery
- Toast notifications for user-facing errors

### Backend
- Caught exceptions logged with stack traces
- JSON error response: `{ error: string, code: string, details?: {} }`
- HTTP status codes: 200, 400, 401, 409, 500
- 409 Conflict: Sync retry logic on client side

## Extensibility

### Adding a New Snippet Language
1. Create `src/services/snippet-generators/generator-{lang}.ts`
2. Export function: `(req: PreparedRequest) => string`
3. Register in `snippet-generator-registry.ts`
4. No other changes needed

### Adding a New Backend Route
1. Create `backend/src/routes/{feature}.ts`
2. Export Hono router
3. Mount in `backend/src/app.ts`
4. Add middleware if needed (auth guard, etc.)

### Adding a New Zustand Store
1. Create `src/stores/{feature}-store.ts`
2. Define state + actions
3. Export hook: `useFeatureStore()`
4. Use in components via hook

## Known Limitations & Trade-offs

1. **No real-time collaboration** (Phase 16) — Sync is pull/push, not live WebSocket
2. **Last-Write-Wins conflict resolution** — Simple but doesn't preserve concurrent edits
3. **Single PostgreSQL database** — Vertical scaling only (sharding in Phase 16)
4. **IndexedDB quota** — ~50MB on most browsers (sufficient for local usage)
5. **Offline queue not yet persisted** (Phase 16) — Pending sync lost on app restart

## Unresolved Questions

- WebSocket implementation strategy for real-time collaboration?
- PostgreSQL sharding approach for multi-region deployment?
- Should we add collection branching/versioning (Git-like)?
