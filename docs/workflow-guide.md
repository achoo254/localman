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

    subgraph Backend["Backend API (Phase 2)"]
        API["Hono API Server"]
        Auth["Better Auth"]
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
    participant Auth as Better Auth
    participant Sync as Sync API
    participant DB as PostgreSQL

    App->>Auth: POST /api/auth/login
    Auth-->>App: Session token

    Note over App: Pull remote changes
    App->>Sync: POST /api/sync/pull {since}
    Sync->>DB: SELECT WHERE updatedAt > since
    DB-->>Sync: collections + requests
    Sync-->>App: {collections, requests, updatedAt}
    App->>App: Merge vào IndexedDB (LWW)

    Note over App: Push local changes
    App->>Sync: POST /api/sync/push {collections, requests, deletions}
    Sync->>DB: UPSERT + DELETE
    DB-->>Sync: OK
    Sync-->>App: {success, syncedAt, conflicts?}
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
| `pnpm test --run` | Vitest (41 tests) |
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
│   ├── components/         # UI components
│   │   ├── layout/         # AppLayout, Titlebar, Sidebar, StatusBar
│   │   ├── request/        # RequestPanel, UrlBar, RequestTabs
│   │   ├── response/       # ResponseViewer, ResponseActions
│   │   ├── collections/    # CollectionTree, FolderItem
│   │   ├── environments/   # EnvironmentBar, EnvironmentManager
│   │   ├── import-export/  # ImportDialog, export utils
│   │   ├── settings/       # SettingsPage (6 tabs)
│   │   └── common/         # Toast, Modal, KeyboardShortcuts
│   ├── stores/             # Zustand state stores
│   ├── db/                 # Dexie.js IndexedDB layer
│   ├── services/           # HTTP client, sync, interpolation, scripts
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helpers, URL params, tree builder
│   └── types/              # TypeScript type definitions
├── src-tauri/              # Rust/Tauri backend
│   ├── src/                # Rust source (main.rs, commands)
│   └── tauri.conf.json     # Tauri configuration
├── backend/                # Cloud sync backend (Hono + Better Auth)
│   ├── src/                # API routes, auth, DB schema
│   └── drizzle/            # Database migrations
├── docs/                   # Project documentation
├── plans/                  # Implementation plans
└── tests/                  # E2E tests (Playwright)
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
        Head["Syne<br/>(UI headlines)"]
    end
```

- **Spacing:** 4px base unit
- **Border radius:** 6–8px
- **Theme:** Dark-first
- **Feedback:** Toast notifications (no modals for minor actions)
