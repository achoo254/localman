# Localman — Project Overview & Product Development Requirements

**Version:** 0.1.0
**Status:** Core features complete (Phases 0–6, 12–13). Phase 10 in progress.
**Last Updated:** 2026-03-18

---

## 1. Vision & Problem Statement

### Problem: The Postman Trap

Current API clients (Postman, Insomnia, Thunder Client) rely on cloud-first architecture:
- **Privacy Risk:** API keys, tokens, and request data route through vendor servers
- **No Offline Work:** Requires internet for most features
- **Expensive:** Team licenses cost $180+/user/year; free tier heavily limited
- **Slow:** Built on Electron (300MB RAM, 3-5s startup)
- **Vendor Lock-in:** Your API library is trapped; export/import is painful

### Solution: Localman

Localman is an **offline-first, privacy-respecting desktop API client** with optional cloud sync:
- **Data Stays Local:** All API collections, environments, and history live on YOUR machine
- **Works Offline:** 100% functional without internet; cloud sync is optional
- **Fast:** Built with Tauri (Rust) — 50MB footprint, <1s startup
- **Free & Open:** No subscription required; no vendor lock-in
- **Team Collaboration:** Optional cloud sync with real-time presence, workspaces, and role-based access

### Target Audience

1. **Individual Developers** — Solo API testing, no need for cloud features
2. **Small Teams** — 5-10 engineers sharing APIs without expensive subscriptions
3. **Privacy-Conscious Users** — Developers who want data on their machine
4. **Performance-First Users** — Teams frustrated by Postman's slow Electron UI
5. **Offline-Heavy Workflows** — Remote/airplane development without internet

---

## 2. Competitive Analysis

| Feature | Localman | Postman | Insomnia | Thunder Client |
|---|---|---|---|---|
| **Offline Capable** | ✅ Full | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| **Cloud-Optional** | ✅ Yes | ❌ Mandatory | ⚠️ Enterprise only | ⚠️ Limited |
| **Free Tier Limits** | ✅ None | ❌ 5 collections | ⚠️ Sync disabled | ⚠️ Sync disabled |
| **Cost (Team)** | ✅ Free | ❌ $180+/user/yr | ⚠️ $99/user/yr | ⚠️ $200/team/yr |
| **Memory Usage** | ✅ ~50MB | ❌ ~300MB | ⚠️ ~200MB | ⚠️ ~150MB |
| **Startup Time** | ✅ <1s | ❌ 3-5s | ⚠️ 2-3s | ⚠️ 2-3s |
| **Data Privacy** | ✅ Local by default | ❌ Cloud by default | ⚠️ Cloud option | ⚠️ Cloud option |
| **Real-Time Sync** | ✅ WebSocket | ✅ WebSocket | ⚠️ Limited | ⚠️ Polling |
| **Import/Export** | ✅ cURL, OpenAPI, Postman | ✅ Yes | ✅ Yes | ✅ Yes |
| **Scriptable** | ✅ QuickJS sandbox | ✅ JavaScript | ✅ JavaScript | ✅ JavaScript |

**Localman's Competitive Advantages:**
1. Privacy-first by design (no mandatory cloud)
2. Offline-first architecture (data is local)
3. 6-10x lighter and faster
4. Free for unlimited collections
5. No vendor lock-in

---

## 3. Success Metrics & KPIs

### User Adoption
- GitHub stars: 1,000+ (awareness)
- Monthly active users: 10,000+ (engagement)
- Retention rate: >60% after 30 days

### Product Quality
- Test coverage: >80% (unit + E2E)
- Zero critical bugs in releases
- Performance: <200ms request send-to-response
- Offline sync success rate: >99.5%

### Business
- Team/workspace adoption: 30% of users
- Cloud sync conversion: 20% of users sign up for sync
- Community contributions: 50+ issues/PRs per month

---

## 4. Core Features (MVP — Phase 0–9)

### 4.1 Request Builder (Phase 1)
- [x] All HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- [x] URL bar with variable interpolation (`{{baseUrl}}/users`)
- [x] Query params editor (key-value with enable/disable toggles)
- [x] Headers editor (smart autocomplete)
- [x] Request body: JSON, Form Data, Multipart, Raw, XML
- [x] Auth types: None, Bearer, Basic, API Key, OAuth 2.0 (auto-refresh)
- [x] Pre/Post scripts (QuickJS sandbox for dynamic requests)

### 4.2 Response Viewer (Phase 1)
- [x] Status code, response time, size display
- [x] Pretty-print JSON with syntax highlighting
- [x] HTML/XML preview (safe rendering)
- [x] Headers and cookies tabs
- [x] Response body export (copy/save)

### 4.3 Collections & Organization (Phases 2–3)
- [x] Collections and nested folders
- [x] Drag-drop reordering
- [x] Favorite/pin requests
- [x] Full-text search across requests
- [x] Context menus (rename, delete, move)
- [x] Request deduplication detection

### 4.4 Environments & Variables (Phase 3)
- [x] Environment sets (Dev, Staging, Prod)
- [x] Dynamic variables: `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`
- [x] Variable interpolation in URL, headers, body, auth
- [x] Environment selector in request bar
- [x] Variable preview in editor

### 4.5 History & Analytics (Phase 4)
- [x] Auto-logged request executions
- [x] Timeline view (grouped by date)
- [x] Searchable history
- [x] One-click re-run from history
- [x] Auto-prune to 1,000 latest entries (quota management)

### 4.6 Code Snippets (Phase 11)
- [x] 16 language generators:
  - cURL, JavaScript, Python, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie, Wget, Curl-Windows
- [x] Copy-to-clipboard
- [x] Language selector in request panel

### 4.7 API Documentation (Phase 5)
- [x] Markdown descriptions for requests
- [x] HTML export with table of contents
- [x] Markdown export for GitHub wikis
- [x] Request card preview (inline docs)

### 4.8 Pre/Post Scripts (Phase 6)
- [x] QuickJS WASM sandbox (safe JavaScript execution)
- [x] Pre-script: Modify request before sending (headers, body, variables)
- [x] Post-script: Parse response, set variables, run assertions
- [x] 5.5-second execution timeout (prevent infinite loops)
- [x] Access to request/response context

### 4.9 Import/Export (Phase 8)
- [x] Import: cURL commands, Postman v2.1 collections, OpenAPI 3.0 specs
- [x] Export: Native JSON backup, Postman v2.1, OpenAPI 3.0
- [x] Bulk import from Postman cloud

### 4.10 Cloud Sync v1 (Phase 9)
- [x] Firebase OAuth authentication
- [x] Team workspaces (create, invite, RBAC)
- [x] Entity-level sync (collections, requests, environments)
- [x] Last-Write-Wins (LWW) conflict resolution
- [x] Offline queue + automatic retry

### 4.11 WebSocket Real-Time (Phase 3–4)
- [x] Live entity updates across devices
- [x] Presence tracking (see who's editing)
- [x] Auto-reconnect with exponential backoff
- [x] Conflict resolution modal (show diffs, user chooses version)

### 4.12 Cloud Sync v2 (Phase 13)
- [x] 3-way merge (local, server, remote)
- [x] Field-level conflict resolution (not just entity-level)
- [x] Optimistic updates + eventual consistency
- [x] Change log service (track deltas)

### 4.13 Auto-Updater (Phase 6)
- [x] Tauri updater plugin integration
- [x] GitHub Releases (minisign-signed)
- [x] Background update checks
- [x] One-click install notification
- [x] Cross-platform builds (Windows/macOS/Linux)

---

## 5. Architecture Decisions

### 5.1 Offline-First Data Flow

**Principle:** Writes go to IndexedDB first, reads from IndexedDB always.

```
User Action
    ↓
Write to IndexedDB
    ↓
Auto-save trigger (300ms debounce)
    ↓
Add to pending_sync queue (if online)
    ↓
POST to /api/sync/push
    ↓
Backend: 3-way merge + LWW conflict resolution
    ↓
Merge result back to IndexedDB
```

**Benefit:** Instant UI feedback, zero network latency for local operations.

### 5.2 Conflict Resolution: Last-Write-Wins (LWW)

**Strategy:** Each entity has `updated_at` timestamp. During sync, the version with the latest `updated_at` wins.

**Example:**
```
Device A modifies "Get Users" at 10:00:01
Device B modifies "Get Users" at 10:00:05
→ Device B's version wins (newer timestamp)
→ Device A receives Device B's version on next sync
```

**When Manual Merge Needed:** Only after 3-way merge detection (local, server, remote diverged). Shows UI modal with diff viewer.

### 5.3 State Management: Zustand

**Stores:**
- `collections-store` — Collections, folders, requests tree
- `request-store` — Current request being edited
- `environment-store` — Environments and variables
- `history-store` — Execution history
- `settings-store` — Preferences, auth tokens, feature flags
- `sync-store` — Cloud sync state, pending changes, conflicts
- `response-store` — Latest response, status, timing
- `update-store` — Auto-updater state

**Pattern:** Store → Service → IndexedDB → Live Query → Component re-render

### 5.4 Request Execution Pipeline

```
Component
    ↓
Request Store (current request + environment)
    ↓
Request Preparer
  • Interpolate variables ({{varName}})
  • Add auth headers (Bearer, Basic, API Key, OAuth)
  • Merge headers/params/body
    ↓
Pre-Script Executor (if defined)
  • Run JavaScript in QuickJS sandbox
  • Modify request dynamically
    ↓
Tauri HTTP Plugin
  • CORS-free HTTP request (no browser restrictions)
  • No redirects by default
    ↓
Post-Script Executor (if defined)
  • Parse response
  • Set variables
  • Run assertions
    ↓
History Logger
  • Auto-save execution to IndexedDB
  • Update response viewer
```

### 5.5 Database Layer: IndexedDB (Dexie.js)

**Schema v4:**
- `collections` (name, folder structure, workspace_id)
- `requests` (URL, method, auth, headers, body, scripts, collection_id)
- `environments` (name, variables, workspace_id)
- `history` (request snapshot, response, timestamp, duration)
- `settings` (feature flags, encrypted refresh token, preferences)
- `folders` (name, parent_id, collection_id, order)
- `pending_sync` (entity type, action, payload, sync_status)
- `drafts` (unsaved request drafts)

**Live Queries:** Dexie's `liveQuery()` hook enables real-time UI updates on any DB change.

### 5.6 Backend Sync Engine

**Tech:** Node.js + Hono 4 + Drizzle ORM + PostgreSQL

**Endpoints:**
- `POST /api/sync/pull` — Fetch delta changes since timestamp
- `POST /api/sync/push` — Upload local changes, get 3-way merge result
- `POST /api/workspace` — Create/list workspaces
- `POST /api/workspace/:id/members` — Invite, manage roles
- `WebSocket /ws` — Real-time presence, entity updates

**Features:**
- Firebase token verification (auth)
- Workspace-scoped RBAC
- Change log service (LWW + 3-way merge)
- WebSocket presence tracking

---

## 6. Technical Requirements

### 6.1 Performance
- Request send-to-response: <200ms (excluding network)
- Page load: <1s
- Scroll/interaction: <16ms frame time (60fps)
- IndexedDB query: <50ms for 10,000 requests
- Offline sync: <5s for 100 pending changes

### 6.2 Scalability
- Support 100,000+ requests per workspace
- Support 1,000+ concurrent users in real-time
- Sync latency: <2s for 100-item changes
- Storage quota: Up to 1GB IndexedDB per workspace

### 6.3 Security
- No sensitive data in localStorage (tokens in memory + encrypted IndexedDB)
- HTTPS only for cloud sync
- Rate limiting on auth endpoints
- XSS protection (sanitize responses, no innerHTML)
- CSRF protection (same-site cookies)
- QuickJS sandbox (prevent script access to DOM/network)

### 6.4 Reliability
- Offline sync success rate: >99%
- Auto-recovery from network interruptions
- Graceful degradation (no backend = offline mode)
- Data backup on export (JSON, Postman format)

### 6.5 Accessibility
- WCAG 2.1 AA compliance (keyboard navigation, screen readers)
- Dark theme by default (reduce eye strain)
- High contrast mode (accessible design tokens)

---

## 7. Development Phases

### Completed
- **Phase 0–9** — Core API client, collections, environments, history, import/export
- **Phase 11** — Code snippets (16 languages)
- **Phase 12** — Draft tab system
- **Phase 13** — Cloud sync v2 with 3-way merge

### In Progress
- **Phase 10** — Performance tuning, Tauri bundler config, cross-platform CI/CD

### Future
- **Phase 14** — GraphQL client, mock server
- **Phase 15** — WebSocket/gRPC support
- **Phase 16** — Mobile app (read-only client)
- **Phase 17** — Team analytics, usage reports

---

## 8. Non-Functional Requirements

### 8.1 Maintenance
- Code coverage: >80% (unit + E2E tests)
- Linting: ESLint + Prettier enforced
- TypeScript strict mode enabled
- Conventional commits (feat:, fix:, docs:, etc.)

### 8.2 Documentation
- Codebase summary with directory structure
- System architecture diagrams (data flow, sync engine)
- API documentation (endpoints, request/response schemas)
- Design guidelines (colors, spacing, component patterns)
- Contribution guide for external developers

### 8.3 Deployment
- Automated CI/CD (GitHub Actions)
- Multi-platform builds (Windows/macOS/Linux)
- Signed releases (minisign for integrity)
- Auto-update mechanism (Tauri updater)

### 8.4 User Support
- In-app error messages (actionable, not cryptic)
- Keyboard shortcuts help modal
- Troubleshooting guide in docs
- GitHub Issues for bug reports
- GitHub Discussions for feature requests

---

## 9. Success Criteria

### MVP (Phase 0–9) — COMPLETE ✅
- [x] Desktop app works offline
- [x] Request builder (all HTTP methods + auth types)
- [x] Collections, environments, history
- [x] Code snippets (16 languages)
- [x] Cloud sync with Firebase auth
- [x] Real-time collaboration (WebSocket)
- [x] Auto-updates (GitHub Releases)
- [x] Passing tests (unit + E2E)
- [x] Multi-platform builds (Windows/macOS/Linux)

### Phase 10 — Performance & Polish (IN PROGRESS)
- [ ] Response time <200ms (request to response)
- [ ] Startup time <1s
- [ ] Memory usage <100MB
- [ ] Battery impact <5% over 8 hours
- [ ] Zero flaky tests
- [ ] All keyboard shortcuts documented
- [ ] Tauri bundler config for all platforms

### Phase 15+ — Advanced Features
- [ ] GraphQL client with query explorer
- [ ] WebSocket/gRPC support
- [ ] Team analytics dashboard
- [ ] OAuth token auto-refresh (no manual login)
- [ ] Environment diff viewer (compare Dev vs Prod)

---

## 10. Known Limitations & Future Work

### Current Limitations
- QuickJS sandbox is serial (one script at a time, no concurrency)
- Offline sync has basic LWW (no sophisticated 3-way merge UI)
- No GraphQL introspection
- No gRPC client
- No mock server
- No team analytics

### Future Roadmap
- **Phase 14+** — GraphQL client, WebSocket, gRPC
- **Phase 15+** — Team analytics, usage reports, API gateway features
- **Phase 16+** — Mobile app (iOS/Android, read-only)
- **Web App** — PWA version with same codebase (CORS proxy needed)

---

## Appendix: Reference Documents

- **[Codebase Summary](./codebase-summary.md)** — Directory structure, component inventory
- **[System Architecture](./system-architecture.md)** — Data flow, sync engine, component hierarchy
- **[Design Guidelines](./design-guidelines.md)** — Design tokens, CSS patterns
- **[Development Roadmap](./development-roadmap.md)** — Phase history, timeline
- **[Workflow Guide](./workflow-guide.md)** — Request flow, keyboard shortcuts
- **[Cross-Platform Testing](./cross-platform-testing.md)** — QA procedures

---

**Document Maintainer:** Documentation Team
**Last Review:** 2026-03-18
