# Localman — Workflow Guide

Hướng dẫn quy trình phát triển, kiến trúc dữ liệu, và release workflow cho Localman.

## 1. Kiến trúc tổng quan

```mermaid
graph TB
    subgraph Desktop["Localman Desktop App"]
        UI["React UI<br/>(Components + Zustand)"]
        Services["Services Layer<br/>(HTTP Client, Interpolation, Scripts)"]
        DB["IndexedDB<br/>(Dexie.js)"]
        Tauri["Tauri Bridge<br/>(Rust — HTTP, File, Window)"]
    end

    subgraph Backend["Backend API (Phase 13)"]
        API["Hono v4.12 API Server"]
        Auth["Firebase Auth"]
        PG["PostgreSQL<br/>(Drizzle ORM)"]
    end

    UI --> Services
    Services --> DB
    Services --> Tauri
    Tauri -->|"HTTPS"| API
    API --> Auth
    API --> PG
```

## 2. Luồng xử lý Request (Core Workflow)

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant Store as Zustand Store
    participant Prep as Request Preparer
    participant Script as QuickJS Sandbox
    participant HTTP as Tauri HTTP Plugin
    participant IDB as IndexedDB

    User->>UI: Nhập URL, headers, body
    UI->>Store: updateActiveRequest()
    Note over Store: Auto-save (debounce 500ms)
    Store->>IDB: Lưu request

    User->>UI: Nhấn Send (Ctrl+Enter)
    UI->>Prep: prepareRequest(request, envContext)
    Prep-->>Prep: Interpolate {{variables}}
    Prep-->>Prep: Add auth headers

    opt Pre-request Script
        Prep->>Script: Chạy pre-script (QuickJS Worker)
        Script-->>Prep: Modified request
    end

    Prep->>HTTP: execute(preparedRequest)
    HTTP-->>HTTP: Bypass CORS (native HTTP)
    HTTP-->>UI: HttpResponse

    opt Post-request Script
        UI->>Script: Chạy post-script
        Script-->>UI: Results
    end

    UI->>Store: Cập nhật response
    Store->>IDB: Lưu history
    UI-->>User: Hiển thị response (syntax highlight)
```

## 3. Offline-First Data Flow

```mermaid
flowchart LR
    A["User Action"] --> B["Write IndexedDB"]
    B --> C{"Online?"}
    C -->|Yes| D["Sync to Cloud"]
    C -->|No| E["Queue in pending_sync"]
    E --> F{"Reconnect?"}
    F -->|Yes| D
    D --> G["Conflict?"]
    G -->|No| H["Done ✓"]
    G -->|Yes| I["LWW by updated_at"]
    I --> H
```

## 4. Quản lý State (Zustand Stores)

```mermaid
graph LR
    subgraph Stores
        CS["collections-store<br/>CRUD collections/folders"]
        RS["request-store<br/>Active tab, drafts"]
        RES["response-store<br/>HTTP response, history"]
        ES["environment-store<br/>Variables, active env"]
        SS["settings-store<br/>Theme, preferences"]
        SYS["sync-store<br/>Cloud session, sync status"]
    end

    subgraph Persistence
        IDB["IndexedDB (Dexie.js)"]
    end

    CS --> IDB
    RS --> IDB
    RES --> IDB
    ES --> IDB
    SS --> IDB
```

## 5. Cloud Sync Flow

```mermaid
sequenceDiagram
    participant App as Desktop App
    participant Auth as Firebase Auth
    participant Sync as Entity Sync API
    participant DB as PostgreSQL

    App->>Auth: Google OAuth login
    Auth-->>App: Firebase ID token + JWT

    Note over App: Pull remote changes
    App->>Sync: POST /api/workspaces/:wsId/sync/pull {entityType?, since?}
    Sync->>DB: SELECT WHERE updatedAt > since
    DB-->>Sync: entities + changeLog
    Sync-->>App: {collections, requests, conflicts?, updatedAt}
    App->>App: 3-way merge to IndexedDB

    Note over App: Push local changes
    App->>Sync: POST /api/workspaces/:wsId/sync/push {entities, deletions}
    Sync->>DB: Field-level merge + UPSERT
    DB-->>Sync: Conflicts (if any)
    Sync-->>App: {syncedAt, conflicts?}
```

## 6. Development Workflow

```mermaid
flowchart TD
    A["Nhận task / Feature request"] --> B["Tạo plan trong plans/"]
    B --> C["Implement code"]
    C --> D["pnpm lint"]
    D -->|Fail| C
    D -->|Pass| E["pnpm type-check"]
    E -->|Fail| C
    E -->|Pass| F["pnpm test --run"]
    F -->|Fail| C
    F -->|Pass| G["Code review"]
    G -->|Issues| C
    G -->|Approved| H["Commit (conventional)"]
    H --> I["Push to GitHub"]
    I --> J["GitHub Actions"]
    J -->|Fail| C
    J -->|Pass| K["Done ✓"]
```

### Commands tham khảo nhanh

| Command | Mục đích |
|---------|----------|
| `pnpm tauri dev` | Dev server + Tauri window |
| `pnpm dev` | Vite dev server (browser only) |
| `pnpm lint` | ESLint check |
| `pnpm type-check` | TypeScript check |
| `pnpm test --run` | Vitest (35 tests) |
| `pnpm tauri build` | Build production app |
| `cargo check` | Check Rust compilation |
| `cargo clippy` | Rust linter |

## 7. Release Workflow

```mermaid
flowchart TD
    A["Fix lint & type errors"] --> B["pnpm lint && pnpm type-check && pnpm test"]
    B --> C["pnpm tauri build"]
    C --> D["Windows: .msi + .exe"]
    C --> E["macOS: .dmg + .app"]
    D --> F["Smoke test"]
    E --> F
    F -->|Bugs found| G["Fix & rebuild"]
    G --> C
    F -->|Pass| H["Tag: git tag v0.x.x"]
    H --> I["GitHub Release"]
    I --> J["Distribute to testers"]
    J --> K["Collect feedback"]
```

### Artifacts location

| Platform | Format | Path |
|----------|--------|------|
| Windows | `.msi` | `src-tauri/target/release/bundle/msi/` |
| Windows | `.exe` (NSIS) | `src-tauri/target/release/bundle/nsis/` |
| macOS | `.dmg` | `src-tauri/target/release/bundle/dmg/` |
| macOS | `.app` | `src-tauri/target/release/bundle/macos/` |

## 8. Cấu trúc thư mục

```
localman/
├── src/                    # Frontend React
│   ├── components/         # UI components (86 total)
│   │   ├── layout/         # AppLayout, Titlebar, Sidebar
│   │   ├── request/        # RequestPanel, UrlBar, RequestTabs
│   │   ├── response/       # ResponseViewer, syntax highlighting
│   │   ├── collections/    # CollectionTree, workspace filtering
│   │   ├── environments/   # EnvironmentSelector, interpolation
│   │   ├── settings/       # SettingsPage (General, Editor, Data, Account, Workspaces)
│   │   ├── sync/           # SyncStatusBadge, ConflictResolutionDialog
│   │   └── common/         # Toast, Modal, KeyboardShortcuts
│   ├── stores/             # Zustand state (11 stores: request, response, collections, sync, etc.)
│   ├── db/                 # Dexie.js IndexedDB layer (Dexie v4.3)
│   ├── services/           # HTTP client, sync, importers/exporters, scripts, snippets (50 files)
│   ├── hooks/              # Custom React hooks (5 custom hooks)
│   ├── utils/              # Helpers, variable interpolation, tree builder (11 utilities)
│   └── types/              # TypeScript type definitions (8 type files)
├── src-tauri/              # Rust/Tauri backend (Tauri 2)
│   ├── src/                # Rust source (plugin registration)
│   └── tauri.conf.json     # Tauri configuration
├── backend/                # Cloud sync API server (Hono 4.12 + PostgreSQL + Firebase Auth)
│   ├── src/                # API routes, middleware, DB schema, services
│   │   ├── routes/         # Health, workspace, collection, entity-sync, environment
│   │   ├── middleware/     # Firebase auth guard, RBAC, error handling
│   │   ├── db/             # Drizzle ORM schema (entities, workspaces, auth)
│   │   ├── services/       # Merge engine, change log, workspace logic
│   │   └── ws/             # WebSocket server (channels, presence, auth)
│   ├── drizzle/            # Database migrations
│   └── ecosystem.config.cjs # PM2 deployment config
├── docs/                   # Project documentation (7 guides)
├── plans/                  # Development phases and implementation plans
├── .github/workflows/      # GitHub Actions CI/CD (lint, test, release builds)
└── tests/                  # Vitest unit tests (35 tests) + Playwright E2E
```

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send request |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+S` | Save request |
| `Ctrl+/` | Toggle keyboard shortcuts modal |

## 10. Design System

```mermaid
graph LR
    subgraph Colors
        BG["Background<br/>#0d0f14"]
        SF["Surface<br/>#12151c"]
        EL["Elevated<br/>#181c25"]
        AC["Accent<br/>#4f8ef7"]
    end

    subgraph Methods["HTTP Method Colors"]
        GET["GET 🟢"]
        POST["POST 🟠"]
        PUT["PUT 🟡"]
        DEL["DELETE 🔴"]
        PATCH["PATCH 🟣"]
    end

    subgraph Fonts
        Code["JetBrains Mono<br/>(code areas)"]
        UI["Inter<br/>(UI text)"]
    end
```

- **Spacing:** 4px base unit
- **Border radius:** 6–8px
- **Theme:** Dark-first
- **Feedback:** Toast notifications (no modals for minor actions)
