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
| 10 | Packaging & CI/CD | ✅ Complete | P1 | GitLab CI/CD, Windows MSI/EXE builds, cross-platform testing | 2026-03 |
| 11 | Code Snippet & API Docs | ✅ Complete | P2 | 16 language snippet generators, docs viewer, HTML/Markdown export | 2026-03-08 |

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

## Upcoming Phases (Future)

### Phase 13: Cloud Sync Phase 2 (Planned)
- Full offline queue with pending_sync store
- Bi-directional sync with conflict resolution
- Share collections with team members
- Real-time collaboration (WebSocket)

### Phase 14: Advanced Features (Planned)
- GraphQL support
- WebSocket client
- Mock server mode
- Performance profiling
- Custom variables (computed, dynamic)

### Phase 15: Team & Analytics (Planned)
- Team workspaces
- Audit logs
- Usage analytics
- Custom themes/branding

## Dependencies & Constraints

- **Sequential Execution**: Max 1 phase at a time
- **GitLab CI/CD**: All changes tested before merge to main
- **Cross-platform**: Windows/macOS/Linux builds validated before release
- **Offline-First**: IndexedDB is source of truth; API is secondary

## Success Metrics

✅ Phase 11 fully delivered and tested
✅ All 16 snippet generators working with correct syntax
✅ API docs viewer rendering collections with markdown support
✅ Export functions producing valid HTML and Markdown files
✅ Code snippet panel lazy-loaded, no bundle regression
✅ All type checks and unit tests passing

## Known Limitations

- Docs export doesn't include example request/response bodies yet (Phase 2)
- TOC scroll-spy uses simple IntersectionObserver (works but not pixel-perfect)
- No docs versioning (single live docs per collection)

## Next Steps

1. Gather user feedback on snippet generators and docs viewer
2. Identify UX improvements for Phase 12
3. Plan cloud sync Phase 2 (pending sync queue, team sharing)
4. Consider GraphQL support based on user demand
