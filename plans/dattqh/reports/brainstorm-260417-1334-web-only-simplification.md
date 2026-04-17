# Brainstorm Report — Web-Only Simplification

**Date:** 2026-04-17
**Owner:** dattqh
**Branch target:** `feat/web-only-simplification`
**Status:** Approved — ready for `/ck:plan`

---

## 1. Problem Statement

Project Localman over-engineered: Tauri desktop + Web + Cloud BE + Sync engine + Auth + WebSocket + Firebase + Drizzle/Postgres + Workspace/Presence/Conflict. Owner mất kiểm soát.

**Mong muốn:** chỉ giữ web SPA chạy offline + 1 BE Node làm CORS proxy cho test API. Dùng Firebase Google Auth bảo vệ proxy endpoint. Bỏ Tauri, bỏ cloud sync, bỏ Postgres/Drizzle/WebSocket/MongoDB.

## 2. Current State (to delete)

**Dirs:**
- `src-tauri/` (Rust + Tauri config)
- `backend/` (Drizzle + Firebase + WS sync — replace by ~150 LoC proxy)
- `plans/260307-1838-cicd-and-cloud-sync/`

**`src/`:**
- `services/sync/`
- `services/auth-handler.ts` + `.test.ts`
- `stores/sync-store.ts`, `conflict-store.ts`, `presence-store.ts`, `workspace-store.ts`
- `*.sync.test.ts`
- Tauri HTTP plugin path trong `services/http-client.ts`

**Config:**
- Tauri scripts trong `package.json`
- Deps: `@tauri-apps/*`, Drizzle, `ws`, Postgres driver
- `pnpm-workspace.yaml` (re-evaluate)
- GitLab CI Windows tag `v*` workflow + Rust steps

## 3. Target Architecture

```
Browser (SPA, offline-first)
  ├─ IndexedDB (Dexie) — single source of truth
  ├─ Zustand stores: collections / requests / envs / history / settings / response
  ├─ Firebase JS SDK — Google sign-in (popup), ID token in memory only
  └─ HTTP client → POST /proxy (Authorization: Bearer <idToken>)
                         ↓
              Node BE (stateless, no DB)
                         ├─ firebase-admin verify token
                         ├─ undici forward request
                         └─ stream response back
```

**Key:** không lưu gì server-side. BE = pure proxy + auth gate.

## 4. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Bỏ MongoDB | Stateless = đơn giản, không cần persist |
| 2 | Clean slate data | Bỏ IndexedDB cũ + cloud data, không migrate |
| 3 | Giữ all FE features | Request builder, collections, envs, history, import/export, QuickJS scripts |
| 4 | Deploy FE/BE tách | FE static (Vercel/Nginx) + BE Node Docker |
| 5 | Firebase Google Auth | Reuse service account JSON sẵn có, FE Firebase JS SDK đơn giản |
| 6 | Bỏ Windows CI | Không còn Tauri build |
| 7 | `requirement.md` giữ nguyên | Tính sau |

## 5. New BE Skeleton

```
backend/
  package.json       (fastify + @fastify/cors + undici + firebase-admin)
  src/
    index.ts         server bootstrap, env load
    auth.ts          firebase-admin verify middleware
    proxy.ts         POST /proxy { method, url, headers, body } → upstream
  .env.example       FIREBASE_SERVICE_ACCOUNT_PATH, ALLOWED_ORIGINS, PORT
  Dockerfile
```

~150 LoC tổng. Không routes/, middleware/, db/, ws/, scripts/, types/, services/.

## 6. Phases

| # | Phase | Goal | Risk |
|---|---|---|---|
| 1 | Branch + audit | Tạo branch, grep imports, list file xóa chính xác | low |
| 2 | Strip FE sync | Xóa stores/services sync, fix imports, `pnpm build` pass | med |
| 3 | Strip Tauri | Rewrite `http-client.ts` → fetch `/proxy`, xóa `src-tauri/`, gỡ deps | med |
| 4 | New BE + Firebase auth | Build BE proxy mới + FE Google sign-in flow | low |
| 5 | Docs + CI cleanup | Update CLAUDE.md, README, docs/, GitLab CI rút gọn | low |

## 7. Risks & Mitigation

- **CORS dev local:** BE chạy song song Vite → npm script `dev:all` (concurrently)
- **Browser fetch giới hạn headers** (User-Agent, Set-Cookie raw...): proxy server-side gửi giúp — không vấn đề
- **Streaming response (SSE/large body):** undici stream forward, không buffer full vào RAM
- **Firebase token expiry:** Firebase JS SDK auto-refresh; FE chỉ lấy `getIdToken()` mỗi request
- **Service account leak:** `.env` + `.gitignore`, không commit JSON; rotate nếu lộ

## 8. Success Criteria

- [ ] `src-tauri/` không còn tồn tại
- [ ] `backend/` chỉ còn 3 file TS + config
- [ ] FE không còn import sync/workspace/conflict/presence
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` pass
- [ ] BE health check + 1 sample proxy request E2E pass
- [ ] Firebase Google sign-in pop-up hoạt động, token verify ok
- [ ] GitLab CI chỉ chạy lint + test (no Windows, no Rust)
- [ ] Docs (CLAUDE.md, README) phản ánh kiến trúc mới

## 9. Out of Scope

- Migrate dữ liệu user hiện có
- Mock server, GraphQL, WebSocket client
- Team collaboration / multi-user workspace
- Cloud sync (đã quyết định bỏ)
- MongoDB / bất kỳ DB nào server-side

## 10. Unresolved Questions

(none — tất cả đã chốt trong brainstorm)
