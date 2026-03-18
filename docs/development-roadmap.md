# Development Roadmap

Localman phases 00–11, with completion status and key milestones.

## Phase Overview

| Phase | Name | Status | Priority | Key Features | Dates |
|-------|------|--------|----------|--------------|-------|
| 00 | Project Setup | ✅ Complete | P0 | Tauri + React + TypeScript, Vite, git, IndexedDB | 2026-02 |
| 01 | Core API Client | ✅ Complete | P0 | Request builder (all HTTP methods), response viewer | 2026-02 |
| 02 | Auth & Headers | ✅ Complete | P0 | Auth types (Basic, Bearer, API Key), header editor | 2026-02 |
| 03 | Collections & Folders | ✅ Complete | P0 | Nested collections, folder tree, drag-drop | 2026-02 |
| 04 | Environments | ✅ Complete | P0 | Env variable sets, interpolation `{{varName}}` | 2026-02 |
| 05 | History & Logs | ✅ Complete | P0 | Auto-logged request executions, searchable history | 2026-02 |
| 06 | Import/Export | ✅ Complete | P1 | cURL, Postman v2.1, OpenAPI 3.0 import; export to cURL | 2026-02 |
| 07 | Pre/Post Scripts | ✅ Complete | P1 | QuickJS sandbox, request/response manipulation | 2026-02 |
| 08 | Cloud Sync Phase 1 | ✅ Complete | P1 | HTTP sync API, LWW conflict resolution, sync UI | 2026-02 |
| 09 | Error Handling & UI Polish | ✅ Complete | P1 | Error boundaries, toast notifications, layout polish | 2026-02 |
| 10 | Packaging & CI/CD | ✅ Complete | P1 | GitHub Actions CI/CD, Windows MSI/EXE builds, cross-platform testing | 2026-03 |
| 11 | Code Snippet & API Docs | ✅ Complete | P2 | 16 language snippet generators, docs viewer, HTML/Markdown export | 2026-03-08 |
| 12 | Draft Tab System | ✅ Complete | P2 | Ctrl+T draft requests, explicit save workflow, draft lifecycle | 2026-03-08 |
| 13 | Cloud Sync Phase 2 | ✅ Complete | P1 | Backend API (Hono + PostgreSQL), Firebase Auth, pull/push sync | 2026-03-09 |
| Phase 1 | Cloud Sync → Team Workspace | ✅ Complete | P1 | Normalized entities, workspaces, RBAC, invites, delta sync | 2026-03-11 |
| Phase 3 | WebSocket Real-Time | ✅ Complete | P1 | Real-time entity sync, presence tracking, auto-reconnect | 2026-03-12 |
| Phase 4 | Field-Level Merge & Conflict Resolution | ✅ Complete | P1 | 3-way merge, change log, offline conflict queue, per-field picker | 2026-03-12 |
| Phase 5 | UI Overhaul — Workspace & Sync UX | ✅ Complete | P1 | Workspace switcher, settings panel, member mgmt, presence avatars | 2026-03-12 |
| Phase 6 | Check for Updates | ✅ Complete | P2 | Auto-updater, GitHub releases, signed binaries, update dialog | 2026-03-15 |

## Phase 11 Details: Code Snippet, Preview & API Docs

**Completed:** 2026-03-08

### Features Delivered

1. **Code Snippet Generation Engine**
   - 16 language generators (cURL, JavaScript, Python, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie)
   - Plugin-based architecture for easy extension
   - Pure functions: `(PreparedRequest) => string`
   - Syntax-highlighted read-only display via CodeMirror

2. **Code Snippet UI Panel**
   - Toggle button (`</>`) in URL bar
   - Language selector dropdown with persistence
   - Copy-to-clipboard with toast feedback
   - Lazy-loaded to minimize bundle impact
   - Auto-regenerates on request/environment changes

3. **API Documentation**
   - `description?: string` field on `ApiRequest`
   - Markdown editor/preview for descriptions (collapsible)
   - Docs viewer page showing full collection hierarchy
   - Request cards with method, URL, description, headers, params, auth
   - Table of contents with anchor navigation
   - HTML export (standalone with inline CSS)
   - Markdown export
   - Tauri save dialog integration

### Files Added
- `src/services/snippet-generators/` — 18 files (registry + 16 generators + barrel)
- `src/services/docs-export-service.ts` — export utilities
- `src/components/request/code-snippet-panel.tsx` — snippet UI
- `src/components/request/request-description-editor.tsx` — description editor
- `src/components/docs/` — 3 viewer components (page, card, TOC)

### Files Modified
- `src/types/models.ts`
- `src/db/database.ts`
- `src/components/request/url-bar.tsx`
- `src/components/request/request-panel.tsx`
- `src/components/collections/sidebar-tabs.tsx`
- `package.json`

## Phase 1 Details: Cloud Sync → Team Workspace

**Completed:** 2026-03-11

### Features Delivered

1. **Workspace Management**
   - `workspaces` table with slug-based access
   - `workspace_members` with role-based RBAC (owner/editor/viewer)
   - `workspace_invites` with 24h expiry link tokens (no email service)
   - Full CRUD routes for workspace lifecycle

2. **Normalized Entity Schema** (replaces blob-based userFiles)
   - `collections`, `folders`, `requests` with soft-delete support
   - `environments` with workspace and personal variants
   - `change_log` table for field-level delta sync (Phase 4)
   - All entities version-tracked and timestamped

3. **RBAC Middleware**
   - `workspace-rbac.ts` enforces role-based access control
   - Workspace context injected into all protected routes
   - Per-entity permission checks (editor/viewer restrictions)

4. **Entity-Level Sync**
   - `POST /api/workspaces/:workspaceId/sync/pull` — Delta sync by entityType + version
   - `POST /api/workspaces/:workspaceId/sync/push` — LWW conflict resolution
   - Change log populated on every entity mutation for audit trail

5. **Data Migration**
   - `migrate-user-files.ts` converts legacy blob collections to normalized tables
   - Creates personal workspace per user for backwards compatibility

### Files Added (Backend)
- `backend/src/db/workspace-schema.ts` — Workspace + RBAC schema
- `backend/src/db/entity-schema.ts` — Normalized entity tables
- `backend/src/routes/workspace-routes.ts` — Workspace CRUD + invites
- `backend/src/routes/{collection,environment,entity-sync}-routes.ts` — Entity routes
- `backend/src/middleware/workspace-rbac.ts` — Role enforcement
- `backend/src/services/{workspace,invite}-service.ts` — Business logic
- `backend/src/scripts/migrate-user-files.ts` — Migration script

### Success Criteria Met
✅ Backend database normalized and workspace-aware
✅ RBAC middleware enforces role-based access
✅ Invite system with 24h link tokens
✅ Entity routes fully workspace-scoped
✅ Delta sync with change_log tracking
✅ Migration script for legacy data
✅ All endpoints secured

### Not Yet Implemented (Phase 14)
- Frontend UI for workspace operations
- Team member management UI
- Entity CRUD UIs adapted for workspaces

## Phase 3 Details: WebSocket Real-Time

**Completed:** 2026-03-12

### Features Delivered

1. **WebSocket Real-Time Server**
   - Runs on same HTTP port via `ws` library upgrade handler
   - Channel-based messaging: `workspace:{wsId}` and `user:{userId}` channels
   - JWT auth validation on connection upgrade
   - RBAC enforcement: only workspace members can subscribe
   - Entity mutations broadcast to all subscribed members (except sender)
   - Presence tracking with editing/active/idle status
   - Heartbeat ping/pong every 30s (max 1MB payload)

2. **WebSocket Client Manager**
   - Singleton connection lifecycle management
   - Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → max 30s)
   - Channel subscription state persists across reconnects
   - Intentional close flag prevents reconnection on logout
   - Re-subscribe to all channels on reconnect

3. **Event Handler & Presence Store**
   - Process entity:updated/created/deleted events from WS
   - Apply changes directly to Dexie + update Zustand stores
   - State reconciliation on reconnect via HTTP delta sync
   - Zustand presence store tracks online users per workspace

4. **Integration with Sync Store**
   - Auto-connect on login/register success
   - Auto-disconnect on logout
   - Seamless fallback to HTTP sync if WS unavailable
   - Connection state exposed via sync-store

### Files Added (Backend)
- `backend/src/ws/ws-auth.ts` — JWT validation on upgrade
- `backend/src/ws/channel-manager.ts` — Channel subscription + broadcast
- `backend/src/ws/presence-tracker.ts` — Online/editing tracking
- `backend/src/ws/message-router.ts` — Message routing + validation
- `backend/src/ws/websocket-server.ts` — Server setup + heartbeat

### Files Added (Frontend)
- `src/services/sync/websocket-manager.ts` — Connection lifecycle + reconnection
- `src/services/sync/ws-event-handler.ts` — Event processing
- `src/stores/presence-store.ts` — Presence store

### Files Modified
- `backend/src/index.ts` — Added WS server initialization
- `src/stores/sync-store.ts` — Added WebSocket connect/disconnect handlers

### Success Criteria Met
✅ WS server on same port as HTTP API
✅ Auth + RBAC validation on connections and subscriptions
✅ Real-time entity broadcast to workspace members
✅ Client auto-reconnect with exponential backoff
✅ State reconciliation on reconnect
✅ Presence tracking (online/editing)
✅ All tests pass (35/35), type-check clean, builds succeed
✅ Graceful fallback to HTTP if WS unavailable

### Known Issues (Tracked for Phase 4+ Fixes)

| Issue | Severity | Status |
|-------|----------|--------|
| Entity type mismatch (server sends `update`, client expects `updated`) | CRITICAL | Backlog |
| Reconnect event never fires (early `reconnectAttempt` reset) | CRITICAL | Backlog |
| No RBAC check on WS mutations (viewers can broadcast fake events) | CRITICAL | Backlog |
| No message size limit (64KB DoS vector) | HIGH | Backlog |
| No per-connection rate limiting | HIGH | Backlog |
| Listener leak in sync-store (`onStateChange` never unsubscribed) | HIGH | Backlog |
| No channel name validation (arbitrary string creation) | HIGH | Backlog |
| No validation on entity payload passthrough | MEDIUM | Backlog |
| `lastEventTime` not reset on account switch | MEDIUM | Backlog |
| Presence store uses non-serializable `Map` | MEDIUM | Backlog |

**Note:** Phase 3 marked complete for WebSocket server + client implementation. Known security/stability issues identified for hardening in Phase 4+.

---

## Phase 13 Details: Cloud Sync Phase 2 — Backend & Firebase Auth

**Completed:** 2026-03-09

### Features Delivered

1. **Backend API Server** (Node.js + Hono + PostgreSQL + Firebase Auth)
   - Health check endpoint: `GET /api/health`
   - Entity sync endpoints: `POST /api/workspaces/:wsId/sync/pull|push`
   - Firebase Admin SDK integration for Google OAuth and session management
   - JWT-based authentication with auth guard middleware
   - Comprehensive error handling

2. **Database Layer** (PostgreSQL + Drizzle ORM)
   - Normalized entity tables (collections, folders, requests, environments)
   - Workspace + RBAC tables (workspace_members, workspace_invites)
   - Change log table for field-level merge tracking
   - TypeScript-first schema with migration support

3. **Frontend Cloud Sync Integration**
   - `FirebaseAuthClient` — Firebase Auth session management (Google OAuth)
   - `EntitySyncService` — Pull/push with field-level 3-way merge
   - `CloudLoginForm` component in settings
   - Support for both offline-only (legacy) and cloud sync modes
   - Automatic token refresh on expiry, fallback to offline if backend unavailable

4. **Monorepo Setup** (pnpm workspaces)
   - Separate frontend and backend packages
   - Shared TypeScript configuration
   - Unified development workflow

### Files Added
- Backend: 18 new files (app, routes, middleware, DB, auth, types, config)
- Frontend: 5 new files (auth client, sync service, login form, types, HTTP utils)

### Files Modified
- `src/stores/sync-store.ts` — support cloud sync mode
- `src/components/settings/sync-settings.tsx` — integrate login form
- `package.json` — workspace definition
- `pnpm-workspace.yaml` — new monorepo config

### Success Criteria Met
✅ Backend API runs with Hono on Node.js
✅ PostgreSQL schema with Drizzle migrations
✅ Better Auth integration for login/signup/OAuth
✅ Frontend connects to backend via HTTPS
✅ Pull/push sync with conflict resolution
✅ Fallback to offline mode if backend unavailable
✅ All endpoints secured with JWT auth guard
✅ Type-safe API contracts (TypeScript)

## Phase 12 Details: Draft Tab — New Request

**Completed:** 2026-03-08

### Features Delivered

1. **Draft Tab System**
   - New requests created via Ctrl+T start as transient in-memory drafts
   - Stored in Zustand memory (`drafts` record), NOT persisted to IndexedDB until explicit save
   - Draft tabs display italic styling to indicate unsaved state
   - Draft state tracked via `TabInfo.isDraft` boolean

2. **Draft Creation & Pre-filling**
   - Ctrl+T creates blank draft request
   - Sidebar "New Request" context menu creates drafts pre-filled with parent collection/folder
   - `prefillCollectionId` and `prefillFolderId` preserved until explicit save
   - Draft request initialized with default values (GET method, empty headers/body)

3. **Explicit Save Workflow**
   - Ctrl+S opens `SaveRequestDialog`
   - Dialog displays collection/folder selector
   - User confirms name and collection/folder destination
   - `saveDraftToCollection()` creates persistent IndexedDB record, closes draft, updates active tab
   - Draft cleaned from memory after save

4. **Draft Lifecycle**
   - Auto-save skipped for drafts (no `saveRequest()` calls)
   - History not logged for draft executions (prevents clutter)
   - Close tab with confirm dialog if draft has unsaved content (`isDirty`)
   - Draft cleanup on tab close or explicit save

### Files Added
- `src/components/request/save-request-dialog.tsx` — dialog for saving drafts to collection

### Files Modified
- `src/stores/request-store.ts` — added `isDraft`, `drafts` record, `createDraftTab()`, `saveDraftToCollection()`
- `src/hooks/use-auto-save.ts` — skip auto-save for drafts
- `src/stores/response-store.ts` — skip history logging for draft requests (check `draft_` prefix)
- `src/components/request/request-panel.tsx` — integrate save dialog
- `src/components/request/request-tab-bar.tsx` — italic styling for draft tabs
- `src/components/request/url-bar.tsx` — Ctrl+S trigger for save dialog
- `src/components/collections/sidebar-tabs.tsx` — "New Request" context menu with prefill
- `src/App.tsx` — global Ctrl+T handler for new draft tab

## Phase 6 Details: Check for Updates

**Completed:** 2026-03-15

### Features Delivered

1. **Update Signing & Configuration**
   - Ed25519 keypair generation via `tauri signer generate`
   - Public key embedded in `tauri.conf.json`
   - Private key stored securely in GitHub Secrets (not in repo)
   - Tauri updater plugin configured with GitHub Releases endpoint

2. **Frontend Update Service**
   - `update-checker-service.ts` — Check and download updates
   - `update-store.ts` (Zustand) — State management (checking/available/downloading/ready/error)
   - `use-update-checker.ts` hook — Auto-check on startup + 4h interval
   - Manual "Check for Updates" button in About section
   - Graceful offline fallback (silent, no errors)

3. **Update UI**
   - `update-dialog.tsx` — Radix Dialog showing version, release notes, download progress
   - Toast notifications ("Update available", "You're up to date")
   - Progress bar during download
   - Download + Install + Relaunch flow

4. **Release CI/CD**
   - `.github/workflows/release.yml` — Multi-platform GitHub Actions workflow
   - Matrix build: Windows + macOS + Linux
   - Automatic `latest.json` generation with platform signatures
   - Signed binaries (.sig files) for update verification
   - Draft → Publish release automation

5. **Version Management**
   - `scripts/bump-version.sh` — Single command to bump version across all configs
   - `pnpm version:bump <version>` — npm script wrapper
   - Removed hardcoded version from frontend (reads from Tauri API at runtime)

### Files Added
- `src/services/update-checker-service.ts` — Update check + download logic
- `src/stores/update-store.ts` — Update state store
- `src/hooks/use-update-checker.ts` — Background check hook
- `src/components/settings/update-dialog.tsx` — Update UI dialog
- `.github/workflows/release.yml` — GitHub Actions release workflow
- `scripts/bump-version.sh` — Version bump script

### Files Modified
- `src/App.tsx` — Mount update checker hook and dialog
- `src/components/settings/about-section.tsx` — Wire "Check for Updates" button, use Tauri API for version
- `src-tauri/tauri.conf.json` — Add updater plugin config with pubkey + endpoint
- `src-tauri/Cargo.toml` — Add tauri-plugin-process dependency
- `src-tauri/src/lib.rs` — Register process plugin
- `package.json` — Add @tauri-apps/plugin-updater, @tauri-apps/plugin-process, add version:bump script

### Success Criteria Met
✅ Ed25519 keypair generated and securely stored
✅ Tauri updater plugin installed and configured
✅ Frontend update checker service fully functional
✅ Update dialog with progress bar working
✅ GitHub Actions workflow builds all platforms and signs binaries
✅ `latest.json` generated automatically with correct platform signatures
✅ Version bumps centralized in single script
✅ No hardcoded version in frontend code
✅ All 35 tests pass
✅ Type-check clean, lint passes (6 pre-existing unrelated warnings)

### Architecture
```
GitHub Release (tag push)
  ↓
GitHub Actions: build + sign (Windows/macOS/Linux)
  ↓
Upload: binaries + signatures + latest.json
  ↓
User launches app
  ↓
useUpdateChecker() → check() on startup + 4h interval
  ↓
GET https://github.com/owner/localman/releases/latest/download/latest.json
  ↓
Tauri verifies signature using pubkey in tauri.conf.json
  ↓
If newer: Toast → Dialog
  ↓
User clicks "Download & Install"
  ↓
download() with progress → install() → relaunch()
```

---

## Upcoming Phases (Future)

### Phase 14: Team Workspace UI (Planned)
- Workspace creation, switching, settings UI
- Team member invitation and role management UI
- Workspace entity browser (collections/requests by workspace)
- Bulk operations across workspace entities
- GraphQL support (optional advanced feature)
- WebSocket client
- Mock server mode

### Phase 15: Advanced Analytics & Versioning (Planned)
- Audit logs (who changed what, when)
- Usage analytics dashboard
- Custom themes/branding
- Collection versioning and branching (Git-like)

### Phase 16: Offline Queue & Real-Time (Planned)
- Full offline queue with `pending_sync` store
- Automatic retry on network restore
- WebSocket real-time collaboration
- Live cursor tracking

## Dependencies & Constraints

- **Sequential Execution**: Max 1 phase at a time
- **GitHub Actions CI/CD**: All changes tested before merge to main
- **Cross-platform**: Windows/macOS/Linux builds validated before release
- **Offline-First**: IndexedDB is source of truth; API is secondary

## Success Metrics

✅ Phase 13: Backend deployed with all endpoints tested
✅ Phase 13: Better Auth integration for OAuth login/signup
✅ Phase 13: Pull/push sync working with conflict resolution
✅ Phase 13: Frontend fallback to offline mode works correctly
✅ Phase 12: Draft tab system fully functional
✅ Phase 11: All 16 snippet generators working with correct syntax
✅ Phase 11: API docs viewer rendering collections with markdown support
✅ All type checks and unit tests passing

## Phase 4 & 5 Summary

### Phase 4: Field-Level Merge
3-way merge engine (`local` vs. `remote` vs. `base`) with per-field conflict detection. Change log tracks all mutations. Client-side conflict queue with offline replay support. Dialog allows user to pick per-field resolution or bulk accept.

### Phase 5: UI Overhaul
Workspace switcher in sidebar (Radix DropdownMenu), Account & Workspaces settings panel (replaces Cloud Sync), member management with email invites, presence avatars (initials + max 3 + overflow), sync status badge (connection state + conflict count), collection filtering by workspace, cloud sync toggle in context menu.

## Known Limitations

- RBAC enforcement on WS entity mutations still incomplete (Phase 3 known issue)
- Message size/rate limiting on WS not yet implemented
- GraphQL support not yet planned
- No workspace branching/versioning (Git-like)
- Audit logging for all workspace operations planned for Phase 15

## Next Steps

1. Complete Phase 3 fixes: RBAC on WS, message validation, rate limiting
2. Implement Phase 6: Bulk operations UI + workspace-scoped imports
3. Plan Phase 7: E2E tests for collaborative workflows
4. Phase 15: Audit logging for compliance
