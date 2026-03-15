[localman_1.html](/uploads/079233e7d3f427e58bd7fe0f66d06a9c/localman_1.html)

# ⚡ Localman — Brainstorming & Product Plan

> **Tagline:** The API client that lives on your machine, syncs to the cloud, and never needs the internet to work.

---

## 1. Tầm nhìn & Định hướng

### Vấn đề Localman giải quyết

| Vấn đề hiện tại (Postman) | Giải pháp Localman |
|---|---|
| Cloud-first, mất data khi offline | Offline-first, IndexedDB là source of truth |
| Nặng, chậm khởi động (Electron bloat) | Nhẹ, nhanh, desktop-first |
| Free tier giới hạn collections/workspace | Không giới hạn khi offline |
| Privacy: data đi qua server Postman | Data ở local máy, sync chỉ khi user chọn |
| Giá subscription cao cho team | Freemium thân thiện hơn |

### Mục tiêu sản phẩm

- **Phase 1 (MVP):** Desktop app offline-first, full API client features
- **Phase 2:** Web app (same codebase, PWA)
- **Phase 3:** Mobile app (read-only + send requests)
- **Phase 4:** Team collaboration với real-time sync

---

## 2. Tech Stack Đề xuất

### Desktop App (Phase 1)

```
Frontend:     React + TypeScript
Desktop shell: Tauri (Rust) — nhẹ hơn Electron 10x
Storage:      IndexedDB (Dexie.js wrapper)
State:        Zustand
UI:           Tailwind CSS + Radix UI
Code editor:  CodeMirror 6
HTTP client:  Native fetch + Tauri HTTP plugin (bypass CORS)
```

### Web App (Phase 2)

```
Same React codebase
PWA với Service Worker
CORS limitation: cần proxy server hoặc browser extension
```

### Backend (Sync Cloud)

```
API:          Node.js + Fastify hoặc Go (Gin)
Auth:         JWT Access Token + Refresh Token
Database:     PostgreSQL (user data) + Redis (session/rate limit)
Sync engine:  Event Sourcing + Webhook delivery
Deploy:       Railway / Render / AWS
```

---

## 3. Kiến trúc Offline-First & Sync

### Data Flow

```
┌─────────────────────────────────────┐
│           Localman Desktop           │
│                                     │
│  User Action                        │
│      │                              │
│      ▼                              │
│  IndexedDB (source of truth)        │
│      │                              │
│      ├──► pending_sync queue        │
│      │         │                    │
│      │         ▼ (khi online)       │
│      │    Sync Engine               │
│      │         │                    │
│      │         ▼                    │
│      │    Cloud API ──► PostgreSQL  │
│      │                              │
│      └──► UI render                 │
└─────────────────────────────────────┘
```

### IndexedDB Schema (v2)

| Store | Key | Indexes | Mô tả |
|---|---|---|---|
| `collections` | `id` | `updated_at` | Nhóm requests |
| `requests` | `id` | `collection_id`, `updated_at` | API requests |
| `environments` | `id` | `name` | Biến môi trường |
| `history` | auto-increment | `timestamp` | Lịch sử gọi API |
| `settings` | `key` | — | Preferences, auth token |
| `pending_sync` | auto-increment | `entity_type` | Queue chờ sync |

### Sync Strategy: Event Sourcing + LWW

**Cơ chế hoạt động:**

1. Mỗi thay đổi → ghi vào IndexedDB → thêm vào `pending_sync` queue
2. Khi online → flush queue lên cloud API (batch hoặc per-item)
3. Cloud lưu event với `device_id` + `user_id` + `updated_at`
4. Pull: client gửi `?since=<timestamp>` → nhận delta changes
5. Merge: **Last-Write-Wins** theo `updated_at`

**Conflict Resolution:**

```
Device A:  update request "name" at 10:00:01
Device B:  update request "name" at 10:00:05

→ Device B wins (newer updated_at)
→ Device A sẽ nhận bản của B khi sync tiếp theo
```

**Khi nào cần manual merge?** (Phase 3+)
- Cùng 1 request, cùng field, offline quá lâu
- Giải pháp: show diff UI, user chọn version

### Auth Flow

```
1. User login → server trả JWT (access_token 15min + refresh_token 30 days)
2. Access token lưu trong memory (không localStorage)
3. Refresh token lưu trong IndexedDB settings (encrypted)
4. Tự động refresh khi access token hết hạn (silent refresh)
5. Sync chỉ hoạt động khi có valid token
6. Offline hoàn toàn không cần token
```

---

## 4. Core Features (MVP)

### 4.1 Request Builder

- [ ] HTTP Methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- [ ] URL bar với variable interpolation (`{{baseUrl}}/users`)
- [ ] Params tab (key-value với enable/disable toggle)
- [ ] Headers tab (key-value, auto-suggest common headers)
- [ ] Body tab: JSON, Form Data, Multipart, Raw text, XML, Binary
- [ ] Auth tab: No Auth, Bearer, Basic, API Key, OAuth 2.0
- [ ] Pre-request Scripts (JavaScript sandbox)
- [ ] Tests/Post-response Scripts

### 4.2 Response Viewer

- [ ] Status code + time + size badge
- [ ] Body: JSON (syntax highlight + collapsible), HTML preview, Raw
- [ ] Headers viewer
- [ ] Cookie viewer
- [ ] Timeline (DNS → TCP → TLS → Send → Receive)
- [ ] Copy response button
- [ ] Save response to file

### 4.3 Collections & Organization

- [ ] Collections với nested folders
- [ ] Drag-and-drop reorder
- [ ] Bulk operations (duplicate, move, delete)
- [ ] Import/Export: JSON, Postman Collection v2.1, OpenAPI 3.0, cURL
- [ ] Search requests toàn bộ collections
- [ ] Request duplication

### 4.4 Environments & Variables

- [ ] Multiple environments (Dev, Staging, Production)
- [ ] Global variables + environment-specific variables
- [ ] Variable highlight trong URL/headers/body
- [ ] Secret variables (masked display)
- [ ] Dynamic variables: `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`

### 4.5 History

- [ ] Auto-log tất cả requests đã gửi
- [ ] Filter by method, status, URL
- [ ] Re-run từ history
- [ ] Export history

### 4.6 Storage (Offline-First)

- [ ] IndexedDB via Dexie.js
- [ ] Auto-save mọi thay đổi (no manual save needed)
- [ ] Data migration khi upgrade schema
- [ ] Export toàn bộ data (backup)
- [ ] Import từ backup

---

## 5. Advanced Features (Phase 2+)

### 5.1 Collection Runner

- [ ] Chạy toàn bộ collection theo thứ tự
- [ ] Set delay giữa requests
- [ ] N iterations
- [ ] Data-driven testing (import CSV/JSON)
- [ ] Test reports (pass/fail, assertion details)

### 5.2 WebSocket Client

- [ ] Connect/disconnect
- [ ] Send messages (text/binary/JSON)
- [ ] Message log (sent/received)
- [ ] Auto-reconnect

### 5.3 GraphQL Support

- [ ] Schema introspection
- [ ] Query autocomplete
- [ ] Variables panel
- [ ] Fragments support

### 5.4 Mock Server

- [ ] Tạo mock endpoints từ collection
- [ ] Custom response templates
- [ ] Conditional responses
- [ ] Request logging

### 5.5 API Documentation

- [ ] Auto-generate docs từ collection
- [ ] Export Markdown / HTML
- [ ] Share via link (cần cloud)

### 5.6 Team Collaboration (Phase 3)

- [ ] Shared workspaces
- [ ] Real-time sync (WebSocket hoặc polling)
- [ ] Role-based access (Owner, Editor, Viewer)
- [ ] Activity feed
- [ ] Comment on requests

---

## 6. UI/UX Design Principles

### Layout (Desktop-First)

```
┌─────────────────────────────────────────────────────┐
│  Titlebar: Logo | Tabs | [Sync Status]              │
├──────────────────────────────────────────────────────┤
│  Env bar: Environment selector | Variable preview   │
├────────────────┬────────────────────────────────────┤
│                │  Request Bar: Method | URL | Send  │
│  Sidebar       ├────────────────────────────────────┤
│  - Nav icons   │  Request Tabs: Params|Auth|Headers │
│  - Collections │  ────────────────────────────────  │
│  - Folders     │  Pane Left    │ Pane Right         │
│  - Requests    │  (Request)    │ (Response)         │
│                │               │                    │
├────────────────┴───────────────┴────────────────────┤
│  Status bar: DB status | Request count | Sync time  │
└─────────────────────────────────────────────────────┘
```

### Design System

- **Theme:** Dark-first (light theme Phase 2)
- **Font:** JetBrains Mono (code) + Syne (UI headlines)
- **Color palette:**
    - Background: `#0d0f14` / `#12151c` / `#181c25`
    - Accent: `#4f8ef7` (blue)
    - Methods: GET=green, POST=orange, PUT=yellow, DELETE=red, PATCH=purple
- **Spacing:** 4px base unit
- **Border radius:** 6-8px (modern, không quá tròn)

### UX Principles

- Auto-save — không cần Ctrl+S cho mọi thứ
- Keyboard shortcuts ưu tiên (Ctrl+Enter = Send, Ctrl+T = New tab)
- Drag-and-drop everywhere có nghĩa
- Toast notifications — không dùng modal cho feedback nhỏ
- Undo/Redo (Ctrl+Z) cho mọi hành động quan trọng

---

## 7. Monetization (Đề xuất)

| Tier | Giá | Giới hạn |
|---|---|---|
| **Free** | $0/tháng | Unlimited collections (local), 1 sync device, basic features |
| **Pro** | $8/tháng | Unlimited sync devices, team share, collection runner, mock server |
| **Team** | $15/user/tháng | Shared workspaces, RBAC, audit logs, SSO |
| **Enterprise** | Custom | On-premise sync server, dedicated support, SLA |

**Chiến lược:**
- Free tier phải đủ mạnh để dùng thật (không cắt core features)
- Sync là killer feature để convert Free → Pro
- Team plan focus vào B2B

---

## 8. Competitive Analysis

| Feature | Localman | Postman | Insomnia | Bruno |
|---|---|---|---|---|
| Offline-first | ✅ Full | ❌ Cloud-first | ⚠️ Partial | ✅ Full (git-based) |
| Open source | ⚠️ TBD | ❌ | ✅ | ✅ |
| Desktop app | ✅ (Tauri) | ✅ (Electron) | ✅ (Electron) | ✅ (Electron) |
| Web app | ✅ Phase 2 | ✅ | ✅ | ❌ |
| Mobile | ✅ Phase 3 | ❌ | ❌ | ❌ |
| Free sync | ✅ 1 device | ⚠️ Limited | ✅ | ✅ (git) |
| Performance | 🚀 Fast (Tauri) | 🐢 Heavy | ⚠️ Medium | 🚀 Fast |
| Privacy | ✅ Local-first | ⚠️ Cloud | ⚠️ Cloud | ✅ Git |

**Localman's differentiator:** Tauri (nhẹ) + Offline-first với UX đẹp hơn Bruno + Sync optional

---

## 9. Development Roadmap

### Phase 1 — MVP Desktop (3-4 tháng)

**Month 1:**
- [ ] Setup Tauri + React + TypeScript
- [ ] IndexedDB layer với Dexie.js
- [ ] Request builder (Method, URL, Params, Headers, Body)
- [ ] HTTP client (bypass CORS qua Tauri native)
- [ ] Response viewer (JSON highlight)

**Month 2:**
- [ ] Collections CRUD + sidebar
- [ ] Environments + variable interpolation
- [ ] Auth types (Bearer, Basic, API Key)
- [ ] History
- [ ] Import cURL

**Month 3:**
- [ ] Pre/Post scripts (JavaScript sandbox)
- [ ] Import Postman Collection
- [ ] Export (JSON, cURL)
- [ ] Settings & preferences
- [ ] Auto-updater

**Month 4:**
- [ ] Polish UI/UX
- [ ] Performance optimization
- [ ] macOS / Windows / Linux packaging
- [ ] Beta testing

### Phase 2 — Sync + Web App (2-3 tháng)

- [ ] Backend API (auth, sync endpoints)
- [ ] JWT auth flow
- [ ] Sync engine (push/pull)
- [ ] Web app (PWA)
- [ ] Payment integration (Stripe)
- [ ] User dashboard

### Phase 3 — Advanced Features (ongoing)

- [ ] WebSocket client
- [ ] GraphQL support
- [ ] Collection runner
- [ ] Mock server
- [ ] API documentation generator

### Phase 4 — Team (6+ tháng)

- [ ] Shared workspaces
- [ ] Real-time collaboration
- [ ] RBAC
- [ ] Enterprise SSO (SAML, OAuth)

---

## 10. Open Questions & Decisions Cần Làm

### Technical Decisions

- [ ] **Tauri vs Electron?**
    - Tauri: nhẹ hơn, Rust backend, nhưng ít thư viện hơn
    - Electron: ecosystem lớn, nhưng nặng (200MB+)
    - → Recommend: **Tauri** nếu team có Rust knowledge

- [ ] **Sync: REST vs WebSocket vs CRDTs?**
    - REST + polling: đơn giản, đủ dùng Phase 2
    - WebSocket: real-time, cần cho team collaboration
    - CRDTs (Automerge/Yjs): tốt nhất cho conflict-free, phức tạp hơn
    - → Recommend: **REST + LWW** cho Phase 2, **CRDTs** cho Phase 4

- [ ] **Open source hay closed source?**
    - Open source: trust, community, Bruno đang làm tốt
    - Closed source: dễ monetize hơn
    - → Option: Open source core, closed source sync backend (như Sentry)

- [ ] **IndexedDB vs SQLite (via Tauri)?**
    - IndexedDB: web-compatible, đã implement
    - SQLite via Tauri: query mạnh hơn, portable file, better for desktop
    - → Phase 1: IndexedDB. Phase 2: Migrate sang SQLite

- [ ] **Script sandbox: iframe vs vm2 vs QuickJS?**
    - Cần safe execution của pre/post scripts
    - → Recommend: **QuickJS** (lightweight, secure, Tauri-compatible)

### Product Decisions

- [ ] Có làm git-based storage không? (như Bruno — mỗi request là 1 file)
    - Pros: version control miễn phí, no sync server needed
    - Cons: phức tạp hơn cho người dùng không biết git

- [ ] Mobile app có send requests thật không?
    - iOS/Android có CORS restriction khác
    - → Phase 3: read-only + simple GET requests

- [ ] Có public API marketplace không?
    - Users share public collections
    - Discovery feature

---

## 11. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Postman cải thiện offline | High | High | Focus UX + performance gap |
| Bruno (open source) cạnh tranh | High | Medium | Sync + web app + UX tốt hơn |
| CORS trên web app | High | High | Browser extension hoặc proxy |
| Data loss khi IndexedDB bị xóa | Medium | High | Export backup thường xuyên, cloud sync |
| Sync conflict phức tạp | Medium | Medium | LWW đủ cho Phase 2, CRDT sau |
| Chậm monetize | Medium | High | Freemium + team plan sớm |

---

## 12. Success Metrics

### Phase 1 (MVP)

- 500 downloads trong tháng đầu
- DAU/MAU ratio > 40%
- Crash rate < 1%
- P95 startup time < 2 giây

### Phase 2 (Sync)

- 10% free users convert to Pro
- Sync latency < 500ms
- 99.9% uptime

### Phase 3 (Growth)

- 10,000 MAU
- NPS > 50
- $10k MRR

---

## 13. Tài nguyên Tham khảo

- [Postman Collection Format v2.1](https://schema.getpostman.com/)
- [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.0)
- [Tauri Documentation](https://tauri.app/docs)
- [Dexie.js (IndexedDB wrapper)](https://dexie.org)
- [Bruno (open source Postman alternative)](https://github.com/usebruno/bruno)
- [CRDTs explained](https://crdt.tech/)
- [Event Sourcing pattern](https://martinfowler.com/eaaDev/EventSourcing.html)

---

*Document này là living document — cập nhật theo từng sprint.*
*Last updated: 2026-03*