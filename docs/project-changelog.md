# Project Changelog

All notable changes to Localman documented here. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Phase 1 Offline-First Release Fixes] — 2026-03-13

### Added

- **Granular Error Boundaries**
  - Enhanced ErrorBoundary component with panel-variant fallback UI
  - Sidebar, request panel, response panel wrapped independently
  - Prevents full-app crash from isolated panel errors
  - Retry button on error fallback UI

- **Request Timeout Support**
  - Request timeout wired from settings to AbortController
  - Cancel button in request panel during execution
  - Clear error differentiation: timeout vs manual cancellation
  - Toast notifications for cancellation and timeout events

- **Draft Auto-Persist**
  - Drafts now persisted to IndexedDB (new `drafts` table in Dexie v4)
  - Draft service (`draft-service.ts`) with CRUD operations
  - Debounced 3s persistence on draft edits
  - Restore drafts on app startup + beforeunload flush
  - Automatic cleanup on close/save transitions

- **Cloud UI "Coming Soon" State**
  - Feature flag guards on all cloud components (`feature-flags.ts`)
  - Cloud sync, login, workspace creation disabled in Phase 1
  - "Coming Soon" labels on disabled sections
  - Zero network requests to cloud backend on startup

- **IndexedDB Quota & History Management**
  - Global error handler for `QuotaExceededError`
  - Rate-limited quota warning toast (max 1 per 60s)
  - Configurable history retention (7/30/90 days or never)
  - "Clear all history" button with confirmation dialog
  - DB health check on app startup

### Modified

- `src/components/common/error-boundary.tsx` — added panel variant + onError callback
- `src/components/layout/app-layout.tsx` — wrapped panels in error boundaries
- `src/stores/response-store.ts` — integrated timeout + cancel support
- `src/stores/request-store.ts` — draft restoration + persistence
- `src/stores/history-store.ts` — auto-cleanup with retention setting
- `src/stores/settings-store.ts` — history retention setting
- `src/components/settings/general-settings.tsx` — timeout, retention UI
- `src/db/database.ts` — Dexie v4 with drafts table + quota error handler

### New Files

- `src/utils/db-error-handler.ts` — centralized DB error handling with quota detection
- `src/utils/feature-flags.ts` — feature flag gates
- `src/db/services/draft-service.ts` — draft CRUD operations

### Success Criteria Met
✅ All 5 phases completed
✅ Type-check: 0 errors
✅ Tests: 35/35 passing
✅ Lint: 0 errors
✅ Offline-first app ready for Phase 1 public release

---

## [Phase 5: UI Overhaul — Workspace & Sync UX] — 2026-03-12

### Added

- **Workspace Switcher** (Sidebar)
  - Radix DropdownMenu with list of user's workspaces (owner or member)
  - Quick switch between active workspace
  - Creates new workspace dialog inline
  - Displays workspace name, owner/member badge

- **Account & Workspaces Settings Panel**
  - Replaces legacy "Cloud Sync" settings panel
  - Tabbed interface: Account | Workspaces | Members
  - Account tab: email, OAuth provider info, logout button
  - Workspaces tab: list, create, invite members, manage roles
  - Members tab: workspace-scoped member list + role management

- **Workspace Member Management Dialog**
  - Add members via email invite
  - Invite link generated with 24h expiry
  - View pending + accepted invites
  - Remove members (owner only)
  - Bulk role change (owner → editor/viewer)

- **Presence Avatars**
  - User initials in colored circle
  - Max 3 avatars shown, +N overflow indicator
  - Hover tooltip with full names
  - Displayed in request/collection header

- **Sync Status Badge**
  - Connected: green indicator + "Syncing..."
  - Error: red X + error tooltip
  - Offline: gray indicator + "Offline"
  - Conflict count: red badge with unresolved count
  - Click to view conflict resolution queue

- **Collection Filtering by Workspace**
  - Collections only show for active workspace
  - Workspace switcher updates collections in real-time
  - Sidebar updates on workspace change

- **Toggle Cloud Sync in Context Menu**
  - Right-click collection → "Sync to Cloud" option
  - Marks collection as synced (isSynced boolean)
  - Auto-pushes to backend on toggle

### Modified

- `src/components/sidebar/workspace-switcher.tsx` — new component
- `src/components/settings/account-workspaces-panel.tsx` — replaces cloud-login-form
- `src/components/workspace/member-management-dialog.tsx` — member management UI
- `src/components/presence/presence-avatars.tsx` — presence visualization
- `src/components/sync/sync-status-badge.tsx` — sync status indicator
- `src/stores/sync-store.ts` — workspace selection, active workspace context
- `src/stores/collections-store.ts` — filter by active workspace
- `src/db/database.ts` — Dexie schema updated for `isSynced` flag

### Success Criteria Met
✅ Workspace switcher functional and responsive
✅ Settings panel allows workspace + member management
✅ Presence avatars show in collaboration mode
✅ Sync status badge displays connection state + conflicts
✅ Collections filtered by active workspace
✅ Cloud sync toggle functional on collections
✅ All tests pass, type-check clean, builds succeed

---

## [Phase 4: Field-Level Merge & Conflict Resolution] — 2026-03-12

### Added

- **Backend Merge Engine** (`entity-merge-service.ts`)
  - 3-way field-level merge: local vs. remote vs. base version
  - Conflict strategies: direct apply (no conflict), auto-merge (field-level), conflict (user picks)
  - `merge3()` function compares each field independently
  - Marks unresolved conflicts for client handling

- **Change Log Service** (`change-log-service.ts`)
  - Tracks field-level mutations on every entity update
  - `fieldChanges: { fieldName: newValue }` JSON payload
  - Version tracking (`fromVersion` → `toVersion`)
  - Audit trail for debugging and admin tools

- **Client Conflict Store** (`conflict-store.ts`, Zustand)
  - Queue of unresolved conflicts per entity
  - Conflict: `{ entityId, entityType, baseVersion, local, remote, autoMergedFields }`
  - `resolveConflict(entityId, picks)` applies user selections
  - Conflict count exposed for badge display

- **Conflict Replay Queue** (`pending-conflicts.ts`)
  - Persisted in IndexedDB for offline mode
  - Replayed on next sync when online
  - Merges user-selected resolutions with latest remote

- **Conflict Resolution Dialog**
  - Per-field view: local vs. remote value
  - Checkboxes: pick local or remote for each field
  - Bulk actions: "Use All Local" or "Use All Remote"
  - Auto-merged fields shown as read-only (already resolved)

### Modified

- `backend/src/routes/entity-sync-routes.ts` — push endpoint returns conflicts
- `backend/src/services/workspace-service.ts` — calls merge engine on push
- `src/stores/sync-store.ts` — handle conflict responses from push
- `src/components/sync/conflict-resolution-dialog.tsx` — user picks per field

### New Files (Backend)

- `backend/src/services/entity-merge-service.ts` — 3-way field-level merge logic
- `backend/src/services/change-log-service.ts` — field mutation tracking

### New Files (Frontend)

- `src/stores/conflict-store.ts` — Zustand conflict queue
- `src/services/sync/conflict-replay.ts` — offline queue + replay
- `src/components/sync/conflict-resolution-dialog.tsx` — conflict picker UI
- `src/types/conflict.ts` — conflict types

### Success Criteria Met
✅ 3-way merge handles field-level conflicts
✅ Change log populated on all entity mutations
✅ Conflict store queues unresolved conflicts
✅ Dialog allows per-field conflict resolution
✅ Offline replay queue works correctly
✅ All tests pass, type-check clean, builds succeed

---

## [Phase 3: WebSocket Real-Time] — 2026-03-12

### Added

- **WebSocket Real-Time Server** (ws library on same HTTP port)
  - Channel model: `workspace:{id}` and `user:{id}` channels
  - JWT auth on upgrade handler, RBAC on subscribe + mutations
  - Message routing: entity mutations (update/create/delete), presence tracking
  - Presence tracking: active/editing/idle status per user per workspace
  - Heartbeat ping/pong every 30s with 1MB max payload
  - Graceful cleanup on disconnect, channel auto-deletion when empty

- **WebSocket Client** (singleton WebSocketManager)
  - Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → max 30s)
  - Channel subscription state preserved across reconnects
  - Event handlers apply WS entity changes to Dexie + Zustand
  - State reconciliation on reconnect via HTTP delta sync
  - Intentional close flag prevents reconnection on logout

- **Presence Store** (Zustand)
  - Track online users per workspace
  - Editing status with entity_id reference
  - Broadcast presence changes to subscribed channels

### Modified

- `backend/src/index.ts` — Added WebSocket server initialization
- `src/stores/sync-store.ts` — Integrated WebSocket connect/disconnect on auth events

### New Files (Backend)

- `backend/src/ws/ws-auth.ts` — JWT token validation on upgrade
- `backend/src/ws/channel-manager.ts` — Channel subscription + broadcast
- `backend/src/ws/presence-tracker.ts` — Online/editing status tracking
- `backend/src/ws/message-router.ts` — Message type routing + entity mutation handling
- `backend/src/ws/websocket-server.ts` — Server setup + heartbeat

### New Files (Frontend)

- `src/services/sync/websocket-manager.ts` — WS connection lifecycle + auto-reconnect
- `src/services/sync/ws-event-handler.ts` — Process incoming WS messages
- `src/stores/presence-store.ts` — Zustand presence store

### Success Criteria Met
✅ WebSocket server runs on same HTTP port as API
✅ Auth required on upgrade, RBAC enforced on mutations
✅ Entity changes broadcast to workspace members
✅ Client auto-reconnects with exponential backoff
✅ State reconciliation after reconnect
✅ Presence shows online users and editing status
✅ All tests pass, type-check clean, builds succeed
✅ Graceful degradation: app works via HTTP if WS unavailable

## [Phase 1: Cloud Sync → Team Workspace] — 2026-03-11

### Added

- **Workspace Management** — Team collaboration containers
  - `workspaces` table: name, slug, owner
  - `workspace_members` table: role-based access (owner/editor/viewer)
  - `workspace_invites` table: link-based 24h expiry invitations (no email service)
  - Routes: list, create, read, update, delete workspaces; invite, accept, manage members

- **Normalized Entity Schema** (replaces blob-based userFiles)
  - `collections` table: workspace-scoped, soft-deletes, version tracking
  - `folders` table: nested support, sort order
  - `requests` table: full request metadata (params, headers, body, auth, scripts)
  - `environments` table: workspace and personal environment variables
  - `change_log` table: field-level change tracking for delta sync (Phase 4)

- **RBAC Middleware** (`workspace-rbac.ts`)
  - Role enforcement: owner > editor > viewer
  - Workspace context injection into request handlers
  - Per-entity permission checks

- **Entity-Level Sync Routes**
  - `POST /api/workspaces/:workspaceId/sync/pull` — Delta sync by entityType, since version
  - `POST /api/workspaces/:workspaceId/sync/push` — Push changes with LWW conflict resolution
  - Change log tracking for field-level deltas

- **Migration Script**
  - `migrate-user-files.ts` — Convert legacy blob collections to normalized tables
  - Preserves request data structure, creates personal workspace per user

### Modified

- Backend: All routes workspace-scoped via middleware, nullable `workspaceId` for backwards compatibility
- Database: Drizzle schema expanded from 2 to 8 tables

### New Files (Backend)

- `backend/src/db/workspace-schema.ts` — Workspace + members + invites tables
- `backend/src/db/entity-schema.ts` — Collections, folders, requests, environments, change_log
- `backend/src/routes/workspace-routes.ts` — Workspace CRUD + invite management
- `backend/src/routes/collection-routes.ts` — Collection CRUD
- `backend/src/routes/environment-routes.ts` — Environment CRUD
- `backend/src/routes/entity-sync-routes.ts` — Delta sync endpoints
- `backend/src/middleware/workspace-rbac.ts` — Role-based access control
- `backend/src/services/workspace-service.ts` — Workspace business logic
- `backend/src/services/invite-service.ts` — Invite token generation + validation
- `backend/src/scripts/migrate-user-files.ts` — Data migration script

### Success Criteria Met
✅ Backend database supports normalized entities + workspaces
✅ RBAC middleware enforces role-based permissions
✅ Invite system generates 24h link tokens
✅ Entity routes support workspace-scoped CRUD
✅ Delta sync endpoints track change_log for field-level syncs
✅ Migration script handles legacy blob → normalized conversion
✅ All routes secured with auth guard + workspace role checks

### Not Yet Implemented (Phase 14)
- Frontend UI for workspace creation, invitation, switching
- Team member management UI
- Entity CRUD UIs for workspace context
- Workspace settings panel

## [Phase 13] — 2026-03-09

### Added

- **Backend API Server** (Node.js + Hono + PostgreSQL + Drizzle ORM + Firebase Auth)
  - Health check endpoint: `GET /api/health`
  - Entity sync endpoints: `POST /api/workspaces/:wsId/sync/pull|push`
  - Firebase Admin SDK integration for Google OAuth
  - JWT-based authentication with auth guard middleware
  - Comprehensive error handling with JSON response formatting

- **Database Layer** (PostgreSQL + Drizzle ORM)
  - Normalized entity tables: collections, folders, requests, environments
  - Workspace + RBAC tables: workspace_members, workspace_invites
  - Change log table for field-level delta sync
  - Migration support via Drizzle migrations
  - TypeScript-first schema definitions

- **Frontend Cloud Sync Integration**
  - `FirebaseAuthClient` — Firebase Auth session management (Google OAuth)
  - `EntitySyncService` — Pull/push sync with field-level 3-way merge
  - `CloudLoginForm` component — Google login UI in settings
  - Support for both offline-only (legacy) and cloud sync modes
  - Firebase session stored in IndexedDB settings store
  - Automatic token refresh on expiry
  - Fallback to offline mode if backend unavailable

- **Monorepo Setup**
  - pnpm workspace configuration (frontend + backend packages)
  - Shared TypeScript config
  - Separate build/dev scripts for frontend and backend

### Modified

- `src/stores/sync-store.ts` — support cloud sync mode selection
- `src/components/settings/sync-settings.tsx` — integrate cloud login form
- `package.json` — workspace definition + backend dependency
- `pnpm-workspace.yaml` — new file for monorepo structure

### New Files

**Backend** (18 total):
- `backend/src/app.ts` — Hono application setup
- `backend/src/index.ts` — Server entry point
- `backend/src/auth.ts` — Better Auth configuration
- `backend/src/env.ts` — Environment variable validation
- `backend/src/routes/health.ts` — Health check route
- `backend/src/routes/sync.ts` — Sync endpoints
- `backend/src/middleware/auth-guard.ts` — JWT validation
- `backend/src/middleware/error-handler.ts` — Error handling
- `backend/src/db/client.ts` — PostgreSQL connection
- `backend/src/db/schema.ts` — Drizzle sync schema
- `backend/src/db/auth-schema.ts` — Better Auth schema
- `backend/src/types/context.ts` — Request context types
- `backend/package.json` — Backend dependencies
- `backend/tsconfig.json` — Backend TypeScript config
- `backend/drizzle.config.ts` — Drizzle migration config
- `backend/.env.example` — Environment template

**Frontend**:
- `src/services/sync/cloud-auth-client.ts` — Better Auth wrapper
- `src/services/sync/cloud-sync-service.ts` — Sync service
- `src/components/settings/cloud-login-form.tsx` — Login form
- `src/types/cloud-sync.ts` — Cloud sync types
- `src/utils/tauri-http-client.ts` — Tauri HTTP wrapper

## [Phase 12] — 2026-03-08

### Added
- **Draft Tab System** — Transient in-memory request drafts (not persisted until explicit save)
  - Ctrl+T creates new blank draft tab
  - Draft tabs display italic styling to indicate unsaved state
  - Ctrl+S opens save dialog to persist draft to collection
  - Draft state tracked via `TabInfo.isDraft` boolean flag
  - In-memory `drafts` record in `useRequestStore` holds unpersisted data

- **Draft Pre-filling** — Context menu creates drafts with parent collection/folder info
  - "New Request" sidebar context menu pre-fills `prefillCollectionId` and `prefillFolderId`
  - Save dialog suggests pre-selected collection/folder
  - Simplifies workflow for organizing requests by folder

- **Auto-save & History Exclusion for Drafts**
  - Auto-save skipped for drafts (300ms debounce bypassed via `isDraft` flag)
  - History not logged for draft executions (prevents clutter in history viewer)
  - Clean memory after save via `drafts` record cleanup

- **Save Dialog** (`save-request-dialog.tsx`)
  - Collection/folder selector with tree view
  - Request name input with draft name pre-fill
  - Async save with DB persistence and UI update

### Modified
- `src/stores/request-store.ts` — added draft management (drafts record, createDraftTab, saveDraftToCollection)
- `src/hooks/use-auto-save.ts` — check `isDraft` flag, skip save if draft
- `src/stores/response-store.ts` — skip history if request id starts with `draft_`
- `src/components/request/request-panel.tsx` — integrate save dialog
- `src/components/request/request-tab-bar.tsx` — italic styling for draft tabs
- `src/components/request/url-bar.tsx` — Ctrl+S trigger for save dialog
- `src/components/collections/sidebar-tabs.tsx` — "New Request" context menu with prefill
- `src/App.tsx` — global Ctrl+T handler for new draft tab

## [Phase 11] — 2026-03-08

### Added
- **Code Snippet Generation** — 16 language generators (cURL, JavaScript fetch/axios, Python, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie)
  - Syntax-highlighted read-only display via CodeMirror
  - Language selector dropdown with last-selected persistence
  - Copy-to-clipboard functionality with toast feedback
  - Auto-regenerates when request/environment changes
  - Lazy-loaded UI panel to minimize bundle impact

- **API Documentation Features**
  - `description?: string` field on `ApiRequest` type
  - Markdown editor/preview for request descriptions (collapsible)
  - Docs viewer page with full collection hierarchy display
  - Table of contents with anchor link navigation
  - Request cards showing method, URL, description, headers, params, auth type
  - HTML export with inline CSS (standalone, print-friendly)
  - Markdown export for docs portability
  - Tauri save dialog for file export

- **Dependencies**
  - `react-markdown` for markdown rendering in docs

### Modified
- `src/types/models.ts` — added `description?: string` to `ApiRequest`
- `src/db/database.ts` — bumped Dexie version for schema update
- `src/components/request/url-bar.tsx` — added `</>` toggle button for snippet panel
- `src/components/request/request-panel.tsx` — integrated snippet panel + description editor
- `src/components/collections/sidebar-tabs.tsx` — added "Docs" tab alongside Collections/Environments/History
- `package.json` — added `react-markdown` dependency

### Files Created
- `src/services/snippet-generators/snippet-generator-registry.ts` — registry, types, language metadata
- `src/services/snippet-generators/generator-curl.ts` — cURL generator
- `src/services/snippet-generators/generator-javascript-fetch.ts` — JS fetch generator
- `src/services/snippet-generators/generator-javascript-axios.ts` — JS axios generator
- `src/services/snippet-generators/generator-python-requests.ts` — Python generator
- `src/services/snippet-generators/generator-go-native.ts` — Go net/http generator
- `src/services/snippet-generators/generator-java-httpurlconnection.ts` — Java HTTPURLConnection generator
- `src/services/snippet-generators/generator-java-okhttp.ts` — Java OkHttp generator
- `src/services/snippet-generators/generator-php-curl.ts` — PHP cURL generator
- `src/services/snippet-generators/generator-csharp-httpclient.ts` — C# HttpClient generator
- `src/services/snippet-generators/generator-ruby-net-http.ts` — Ruby Net::HTTP generator
- `src/services/snippet-generators/generator-swift-urlsession.ts` — Swift URLSession generator
- `src/services/snippet-generators/generator-kotlin-okhttp.ts` — Kotlin OkHttp generator
- `src/services/snippet-generators/generator-dart-http.ts` — Dart http generator
- `src/services/snippet-generators/generator-rust-reqwest.ts` — Rust reqwest generator
- `src/services/snippet-generators/generator-powershell.ts` — PowerShell generator
- `src/services/snippet-generators/generator-httpie.ts` — HTTPie generator
- `src/services/snippet-generators/index.ts` — barrel export
- `src/services/docs-export-service.ts` — HTML/Markdown export functions
- `src/components/request/code-snippet-panel.tsx` — snippet UI panel with language selector
- `src/components/request/request-description-editor.tsx` — markdown description editor/preview
- `src/components/docs/docs-viewer-page.tsx` — API docs viewer page
- `src/components/docs/docs-request-card.tsx` — individual request documentation card
- `src/components/docs/docs-table-of-contents.tsx` — table of contents sidebar

## [Phase 6: Check for Updates] — 2026-03-15

### Added
- **Update Checker Service** (`src/services/update-checker-service.ts`)
  - Check GitHub Releases for new versions
  - Download with progress tracking
  - Install + relaunch capability
  - Graceful offline fallback

- **Update Store** (`src/stores/update-store.ts`)
  - Zustand state: status (idle/checking/available/downloading/ready/error)
  - Update info: version, release notes, date
  - Download progress: bytes/total

- **Update UI Components**
  - Auto-check on startup + 4-hour interval
  - "Check for Updates" button in About section
  - Update dialog with release notes + progress bar
  - Toast notifications for status

- **Release Workflow** (`.github/workflows/release.yml`)
  - Matrix builds: Windows + macOS + Linux
  - Ed25519 signed binaries
  - Automatic `latest.json` generation
  - GitHub Releases integration

- **Version Management**
  - `scripts/bump-version.sh` for centralized versioning
  - Tauri updater plugin configuration
  - GitHub Releases as distribution channel

### Modified
- `src/App.tsx` — mount update checker + dialog
- `src/components/settings/about-section.tsx` — version display + check button
- `src-tauri/tauri.conf.json` — updater plugin + public key
- `src-tauri/Cargo.toml` — process plugin for relaunch
- `package.json` — @tauri-apps/plugin-updater, version:bump script

### Success Criteria Met
✅ Ed25519 keypair generated and securely stored
✅ GitHub Actions workflow builds all platforms
✅ Auto-check functionality with 4-hour interval
✅ Manual "Check for Updates" button working
✅ Download progress tracking with UI
✅ All 35 tests pass, type-check clean
✅ Cross-platform signed binaries

## [Phase 10] — 2026-02-XX

(Earlier phases documented in their respective plan files)

## Unresolved Questions

None at this time.
