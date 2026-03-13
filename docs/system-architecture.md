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
│   ├── Titlebar (logo, sync status badge, presence avatars, window controls)
│   ├── Sidebar
│   │   ├── SidebarTabs (Collections, Environments, History, Docs)
│   │   ├── Collections Tab (conditional sections)
│   │   │   ├── PersonalSection
│   │   │   │   ├── CollectionSectionHeader (Personal + Add button)
│   │   │   │   └── CollectionTree (personal collections)
│   │   │   │       └── RequestItem / FolderItem (recursive)
│   │   │   └── TeamSection (if user in workspaces)
│   │   │       ├── WorkspaceGroup (one per workspace)
│   │   │       │   ├── CollectionSectionHeader (Workspace name + Add)
│   │   │       │   └── CollectionTree (workspace collections)
│   │   │       └── MemberManagementDialog (email invites, role mgmt)
│   │   └── EnvironmentSelector (workspace-scoped)
│   ├── RequestPanel
│   │   ├── UrlBar (method, URL, Send button, Snippet toggle)
│   │   ├── RequestTabs (Params, Headers, Body, Auth, Description)
│   │   ├── CodeSnippetPanel (lazy-loaded, language selector)
│   │   └── ResponsePane (status, headers, body with syntax highlight)
│   ├── SaveRequestDialog (draft save UI, modal)
│   ├── ConflictResolutionDialog (per-field picker, bulk actions)
│   ├── CloudLoginForm (Firebase Google login)
│   └── SyncStatusBadge (connection state, conflict count)
└── Toast Notifications
```

### State Management (Zustand)

| Store | Responsibility |
|-------|-----------------|
| `collections-store` | CRUD collections/folders/requests, filtered by workspace |
| `request-store` | Active tab, draft management, form state |
| `response-store` | HTTP response, history |
| `settings-store` | Theme, language, sync preferences |
| `sync-store` | Sync mode, cloud session, workspace context, pull/push status |
| `env-store` | Selected environment, workspace-scoped variables |
| `conflict-store` | Queue of unresolved conflicts, user resolutions |
| `presence-store` | Online users, editing status per workspace |

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

#### Cloud Sync (Pull — 3-Way Merge)
```
User enables cloud sync + logs in via Firebase
  ↓
FirebaseAuthClient.login() → Firebase Auth session (Google)
  ↓
User selects workspace + clicks "Sync" or auto-sync triggers
  ↓
EntitySyncService.pull()
  ↓
POST /api/workspaces/:wsId/sync/pull { entityType?, since? }
  ↓
Backend returns { collections, requests, conflicts, changeLog }
  ↓
Frontend 3-way merge:
  - Compare local vs. remote vs. baseVersion
  - Field-level conflict detection
  - Auto-merge non-conflicting fields
  - Queue unresolved conflicts for user resolution
  ↓
collections-store + conflict-store updated
  ↓
If conflicts exist: ConflictResolutionDialog opens
  ↓
User resolves or ignores conflicts
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

#### Authentication (Firebase)
```
Client-side:
- Firebase Auth SDK (client initialization)
- Google OAuth sign-in
- ID token obtained from Firebase

Server-side:
- Verify ID token via Firebase Admin SDK
- Create user record (if new)
- Return JWT for API requests (using Firebase token)
```

#### Workspace Routes (Authenticated)
```
GET /api/workspaces
→ List user's workspaces (owner or member)

POST /api/workspaces
Body: { name, slug }
→ Create workspace (current user = owner)

GET /api/workspaces/:workspaceId
→ Get workspace details + members (require viewer role)

PATCH /api/workspaces/:workspaceId
Body: { name, slug }
→ Update workspace (owner only)

DELETE /api/workspaces/:workspaceId
→ Delete workspace (owner only)

POST /api/workspaces/:workspaceId/invite
Body: { email, role }
→ Create 24h invite link (owner only)

POST /api/workspaces/:workspaceId/accept-invite
Body: { token }
→ Accept invite, add user to workspace

PATCH /api/workspaces/:workspaceId/members/:userId/role
Body: { role }
→ Change member role (owner only)

DELETE /api/workspaces/:workspaceId/members/:userId
→ Remove member (owner only)
```

#### Entity Routes (Authenticated, Workspace-scoped)
```
POST /api/workspaces/:workspaceId/collections
Body: { name, description }
→ Create collection in workspace

GET /api/workspaces/:workspaceId/collections
→ List collections in workspace

PATCH /api/workspaces/:workspaceId/collections/:collectionId
Body: { name, description }
→ Update collection (editor+ role)

DELETE /api/workspaces/:workspaceId/collections/:collectionId
→ Delete collection (editor+ role)

POST /api/workspaces/:workspaceId/collections/:collectionId/requests
Body: { name, method, url, headers, body, ... }
→ Create request in collection

GET /api/workspaces/:workspaceId/collections/:collectionId/requests
→ List requests in collection (with nested folders)

PATCH /api/workspaces/:workspaceId/requests/:requestId
Body: { method, url, headers, body, ... }
→ Update request (editor+ role)

DELETE /api/workspaces/:workspaceId/requests/:requestId
→ Delete request (editor+ role)

[Similar routes for environments and folders]
```

#### Entity-Level Sync (3-Way Merge with Field-Level Conflict Detection)
```
POST /api/workspaces/:workspaceId/sync/pull
Body: { entityType?, entityId?, since? }
→ Fetch entities modified since last sync timestamp
→ Response: {
    collections: [{id, name, description, version, baseVersion, updatedAt, ...}],
    requests: [{id, collectionId, method, url, headers, body, auth, version, ...}],
    changeLog: [{entityId, entityType, fieldChanges, fromVersion, toVersion, ...}],
    updatedAt: timestamp
  }

POST /api/workspaces/:workspaceId/sync/push
Body: {
  collections: [{id, name, version, baseVersion, updatedAt, ...}],
  requests: [{id, collectionId, url, version, baseVersion, updatedAt, ...}],
  deletions: {collectionIds: [], requestIds: []}
}
→ Server 3-way merge: local vs. remote vs. baseVersion
→ Field-level conflict detection
  - If field unmodified locally → accept remote
  - If field unmodified remotely → accept local
  - If both modified → conflict (queue for user)
→ Auto-merge non-conflicting fields
→ Response: {
    syncedAt,
    conflicts: [{
      entityId,
      entityType,
      baseVersion,
      conflictingFields: ['url', 'headers'],
      local: {...},
      remote: {...}
    }]
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

#### Workspaces & RBAC
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  ownerId TEXT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY,
  workspaceId UUID NOT NULL,
  userId TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor',  -- owner/editor/viewer
  joinedAt TIMESTAMP
);

CREATE TABLE workspace_invites (
  id UUID PRIMARY KEY,
  workspaceId UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor',
  token VARCHAR(64) UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,  -- 24h expiry
  acceptedAt TIMESTAMP,
  createdAt TIMESTAMP
);
```

#### Normalized Entity Tables
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY,
  workspaceId UUID,  -- NULL for personal collections
  userId TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sortOrder INTEGER DEFAULT 0,
  isSynced BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  baseVersion INTEGER,  -- for 3-way merge tracking
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP  -- soft delete
);

CREATE TABLE folders (
  id UUID PRIMARY KEY,
  collectionId UUID NOT NULL,
  parentId UUID,  -- nested folders
  name VARCHAR(255) NOT NULL,
  sortOrder INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);

CREATE TABLE requests (
  id UUID PRIMARY KEY,
  collectionId UUID NOT NULL,
  folderId UUID,
  name VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  url TEXT,
  params JSONB,
  headers JSONB,
  body JSONB,
  auth JSONB,
  description TEXT,
  preScript TEXT,
  postScript TEXT,
  version INTEGER DEFAULT 1,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);

CREATE TABLE environments (
  id UUID PRIMARY KEY,
  workspaceId UUID,  -- workspace or personal
  userId TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  variables JSONB,
  isActive BOOLEAN DEFAULT false,
  isSynced BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);

CREATE TABLE change_log (
  id UUID PRIMARY KEY,
  entityType VARCHAR(20) NOT NULL,  -- collection|folder|request|environment
  entityId UUID NOT NULL,
  workspaceId UUID,
  userId TEXT NOT NULL,
  fieldChanges JSONB NOT NULL,  -- {fieldName: newValue, ...}
  fromVersion INTEGER NOT NULL,
  toVersion INTEGER NOT NULL,
  createdAt TIMESTAMP
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
│  Frontend: pnpm tauri dev or pnpm dev
│  Backend: cd backend && npm run dev → Hono on :3000
│  Database: PostgreSQL local or Docker
│
├─ Staging / Production
│  Build Backend: npm run build (outputs dist/)
│  Build Frontend: pnpm build (outputs dist/)
│  PM2 Config: ecosystem.config.cjs
│    - Start: pm2 start ecosystem.config.cjs
│    - Manages: backend (Node.js), frontend (static serving via Nginx)
│  PostgreSQL: Cloud-hosted (e.g., AWS RDS, Railway)
│  Nginx: Reverse proxy + TLS
│    - / → Frontend static (vite build output)
│    - /api/* → Backend (port 3000)
│    - Auto-redirect HTTP → HTTPS
│
└─ Scaling
   PostgreSQL connection pooling (Drizzle managed)
   Nginx load balancing (future)
   PM2 cluster mode (future)
```

### Nginx Configuration (Same-Domain Serving)

```nginx
# Serve frontend at root (/)
location / {
  root /app/dist/frontend;
  try_files $uri $uri/ /index.html;
}

# Proxy API requests to backend
location /api/ {
  proxy_pass http://localhost:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# WebSocket upgrade
location /ws {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
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

## WebSocket Architecture (Phase 3)

### Real-Time Server

```
HTTP/WS Server (Hono + @hono/node-server)
  │
  ├── HTTP routes (existing)
  │
  └── WebSocket Server (ws library, noServer mode)
        │
        ├── Upgrade Handler
        │   ├── Auth: validate JWT token from query param
        │   ├── Accept/reject based on Better Auth session
        │   └── Attach user metadata to connection
        │
        ├── Channel Manager
        │   ├── workspace:{wsId} → Set<WebSocket>
        │   ├── user:{userId} → Set<WebSocket> (personal sync)
        │   └── Cleanup on disconnect
        │
        ├── Message Router
        │   ├── subscribe/unsubscribe channels (RBAC check)
        │   ├── entity:update/create/delete → validate + broadcast
        │   ├── presence → online/editing status
        │   └── Error handling for auth failures, invalid channels
        │
        └── Heartbeat (ping/pong every 30s, max 1MB payload)
```

### Real-Time Client

```
WebSocketManager (singleton)
  │
  ├── Connection Lifecycle
  │   ├── connect(serverUrl, token) → open WebSocket with token in query
  │   ├── disconnect() → clean close with intentional flag
  │   └── auto-reconnect (exponential backoff: 1s → 2s → 4s → 8s → max 30s)
  │
  ├── Channel Management
  │   ├── subscribe(channel) → store locally, send subscribe message
  │   ├── unsubscribe(channel)
  │   └── re-subscribe on reconnect
  │
  ├── Event Handler
  │   ├── entity:updated → update in Dexie + refresh Zustand
  │   ├── entity:created → insert into Dexie
  │   ├── entity:deleted → soft delete in Dexie
  │   ├── presence → update presence-store (online users, editing status)
  │   └── reconnected → trigger state reconciliation via HTTP delta sync
  │
  └── Heartbeat Response
      └── Respond to ping with pong to keep connection alive
```

### WebSocket Protocol

| Direction | Message Type | Purpose | Payload |
|-----------|--------------|---------|---------|
| C→S | `subscribe` | Join workspace channel | `{ type, channel }` |
| C→S | `unsubscribe` | Leave channel | `{ type, channel }` |
| C→S | `entity:update` | Mutate entity (editor+ role) | `{ entity_type, entity_id, base_version, changes }` |
| C→S | `entity:create` | Create new entity | `{ entity_type, data, parent_id?, collection_id? }` |
| C→S | `entity:delete` | Delete entity | `{ entity_type, entity_id }` |
| C→S | `presence` | Set editing/active/idle status | `{ status, entity_id?, workspace_id }` |
| C→S | `pong` | Respond to heartbeat | `{ type: "pong" }` |
| S→C | `entity:updated` | Broadcast change to members | `{ entity_type, entity_id, version, changes, user_id }` |
| S→C | `entity:created` | Broadcast creation | `{ entity_type, entity, user_id }` |
| S→C | `entity:deleted` | Broadcast deletion | `{ entity_type, entity_id, user_id }` |
| S→C | `presence` | Broadcast user status | `{ user_id, user_name, status, entity_id?, workspace_id }` |
| S→C | `subscribed` | Confirm subscription | `{ channel }` |
| S→C | `ping` | Keep-alive probe | `{ type: "ping" }` |
| S→C | `error` | Error response | `{ code, message }` |

### Integration Points

- **sync-store.ts**: On login, connect WebSocket. On logout, disconnect and clear state.
- **ws-event-handler.ts**: Listen to WebSocket events, apply to Dexie and Zustand stores.
- **entity-sync-service.ts**: On reconnect, fetch missed changes via HTTP delta sync (POST /api/workspaces/:wsId/sync/pull).
- **presence-store.ts**: Zustand store tracking online users per workspace.

### Graceful Degradation

If WebSocket is unavailable or connection drops, app falls back to HTTP polling for sync. User can still edit and execute requests offline; changes flush via HTTP when connection restores.

## Known Limitations & Trade-offs

1. **RBAC not enforced on WS mutations** (Phase 3) — HTTP validates, WS broadcasts trusted (Phase 6)
2. **No message size/rate limits on WS** (Phase 3) — 64KB payload limit + sliding window rate limit planned (Phase 6)
3. **Field-level merge limited to direct edits** — Concurrent nested edits may still conflict
4. **Single PostgreSQL database** — Vertical scaling only (sharding in Phase 16+)
5. **IndexedDB quota** — ~50MB on most browsers (sufficient for local usage)
6. **Pending sync persisted but not auto-retried** — Manual retry on next sync
7. **No audit logging** (Phase 15) — Who changed what, when
8. **Workspace branching not supported** — Single branch per workspace (Git-like versioning Phase 15+)

## Unresolved Questions

- Should entity mutations allow concurrent nested field edits without conflicts?
- PostgreSQL sharding strategy for multi-region deployment?
- Collection branching/versioning (Git-like workflow) scope and design?
- Audit logging retention policy and query performance impact?
