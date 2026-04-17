# Phase 03 — Strip Tauri Desktop

**Status:** completed
**Priority:** P0
**Effort:** M (~2h)
**Depends on:** Phase 02

## Overview
Xóa toàn bộ Tauri Rust shell. Rewrite HTTP client từ Tauri plugin → browser `fetch` gọi BE proxy `/proxy`.

## Files/Dirs to Delete
- `src-tauri/` (toàn bộ — Cargo, Rust, capabilities, gen, icons, target, tauri.conf.json)
- `scripts/` nếu có script Tauri-only

## Files to Modify

### `src/services/http-client.ts` <!-- Updated: Validation Session 1 - localhost direct + raw proxy stream -->
- Bỏ branch dùng `@tauri-apps/plugin-http`
- **Two paths based on URL host (Validation S1 #5):**
  - `isLocalHost(url)` → host ∈ {`localhost`,`127.0.0.1`,`0.0.0.0`,`[::1]`} or ends with `.localhost` → call `fetch(url, { method, headers, body })` directly (no token, no proxy)
  - else → POST to `/proxy` with original `{ method, url, headers, body }` JSON; attach `Authorization: Bearer ${idToken}` only if `getCurrentIdToken()` returns truthy
- **Proxy response parsing (Validation S1 #2):** BE returns RAW upstream body (any content-type). Read upstream meta from response headers:
  - `X-Upstream-Status` (number)
  - `X-Upstream-Status-Text`
  - `X-Upstream-Headers` (JSON string of original headers)
  - `Content-Type` passes through verbatim
- Map all of the above to existing internal `Response` type. Use `await res.arrayBuffer()` for binary safety; convert to text/json downstream.

### `package.json`
- Remove deps: `@tauri-apps/api`, `@tauri-apps/cli`, `@tauri-apps/plugin-http`, `@tauri-apps/plugin-*`
- Remove scripts: `tauri`, `tauri dev`, `tauri build`
- Verify `dev`/`build` scripts standalone (Vite only)

### `vite.config.ts`
- Remove Tauri-specific config (e.g. `clearScreen: false`, `server.strictPort`, `server.hmr` Tauri tweaks if any)
- Remove WebView origin allowlist nếu chỉ dành cho Tauri

### `index.html`
- Remove Tauri meta/CSP if present

### `src/types/`
- Remove Tauri global type augmentations

## Env / Config

Add `VITE_PROXY_URL` to `.env.example` (default `http://localhost:3001/proxy` for dev).

## Steps

1. Delete `src-tauri/` dir
2. Rewrite `src/services/http-client.ts` (single fetch path)
3. Strip Tauri deps + scripts from `package.json`, run `pnpm install`
4. Clean `vite.config.ts` of Tauri-specific bits
5. Add `VITE_PROXY_URL` to `.env.example`
6. Grep `@tauri-apps` lần cuối → 0 hits
7. `pnpm build` — pass
8. `pnpm lint` + `pnpm type-check` — pass
9. `pnpm test` — pass (mock fetch in HTTP client tests)

## Todo
- [ ] Delete `src-tauri/`
- [ ] Rewrite `http-client.ts` to fetch /proxy
- [ ] Remove Tauri deps from package.json
- [ ] Remove Tauri scripts from package.json
- [ ] Clean vite.config.ts
- [ ] Add VITE_PROXY_URL to .env.example
- [ ] Update http-client tests (mock fetch)
- [ ] `pnpm build` + `pnpm lint` + `pnpm type-check` + `pnpm test` pass
- [ ] No `@tauri-apps` references anywhere

## Success Criteria
- `src-tauri/` không còn tồn tại
- `pnpm build` chạy thuần Vite
- HTTP requests đi qua `/proxy` (kiểm tra DevTools Network ở phase 4)

## Risks
- Browser fetch không cho 1 số headers (e.g. `Cookie` raw, `User-Agent`) → BE proxy server-side gửi giúp; không cản FE
- Nếu still có code phụ thuộc `window.__TAURI__` → grep và xóa
- HMR khi dev mode local — nhớ chạy BE proxy song song (sẽ làm ở phase 4)

## Next
Phase 04 build BE mới + Firebase Auth flow.
