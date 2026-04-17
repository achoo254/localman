# Phase 04 — Replace BE + Firebase Auth

**Status:** completed
**Priority:** P0
**Effort:** M (~3h)
**Depends on:** Phase 03

## Overview
Xóa `backend/` cũ (Drizzle/Firebase/WS sync). Tạo BE mới ~150 LoC: Fastify + undici proxy + firebase-admin verify. Thêm Firebase JS SDK + Google sign-in popup vào FE, attach Bearer token mỗi `/proxy` call.

## Delete Entire Old Backend
- `backend/src/` (toàn bộ)
- `backend/drizzle/`
- `backend/auth-schema.ts`
- `backend/drizzle.config.ts`
- `backend/ecosystem.config.cjs`
- `backend/esbuild.config.js`
- `backend/plans/`
- `backend/deploy/`
- `backend/localman-36eac-firebase-adminsdk-fbsvc-*.json` <!-- Updated: Validation S1 #4 - inline JSON env, no on-disk credential -->

**Credential strategy (Validation S1 #4):** Service account JSON now provided inline via `FIREBASE_SERVICE_ACCOUNT_JSON` env var. Delete the on-disk JSON file from repo. Add defensive `.gitignore` rule `*firebase-adminsdk*.json` to prevent re-commit.

## New BE Structure

```
backend/
  package.json                  fastify, @fastify/cors, undici, firebase-admin, dotenv
  tsconfig.json                 NodeNext, strict
  .env.example                  PORT, ALLOWED_ORIGINS, REQUIRE_AUTH, FIREBASE_SERVICE_ACCOUNT_JSON
  .gitignore                    .env, *firebase-adminsdk*.json
  Dockerfile                    node:22-alpine multi-stage
  src/
    index.ts                    server bootstrap, env load, register CORS + auth + proxy routes
    auth.ts                     firebase-admin init (from inline JSON env) + conditional verifyIdToken
    proxy.ts                    POST /proxy handler — undici streaming + X-Upstream-* meta headers
```

### `src/index.ts` (sketch ~40 LoC)
- Load `.env`
- `fastify({ logger: true })`
- Register `@fastify/cors` with `ALLOWED_ORIGINS`
- Register `auth` decorator
- Routes: `GET /health` (no auth), `POST /proxy` (auth required)
- Listen on `PORT`

### `src/auth.ts` (~40 LoC) <!-- Updated: Validation S1 #1 + #4 -->
- `const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true'`
- If `REQUIRE_AUTH`: parse `JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)`, init `admin.initializeApp({ credential: admin.credential.cert(parsed) })`
- Export `verifyAuth(req, reply)` preHandler:
  - If `!REQUIRE_AUTH` → return (anonymous OK, attach `req.user = null`)
  - Read `Authorization: Bearer <token>`; if missing → 401
  - `admin.auth().verifyIdToken(token)` → attach `req.user = decoded`
  - On fail → 401
- Boot guard: if `REQUIRE_AUTH=true` and `FIREBASE_SERVICE_ACCOUNT_JSON` missing/invalid JSON → exit 1 with clear error.

### `src/proxy.ts` (~60 LoC) <!-- Updated: Validation S1 #2 - raw passthrough + meta headers -->
- Schema validate body: `{ method, url, headers?, body? }`
- Use `undici.request(url, { method, headers, body })`
- Strip hop-by-hop request headers before forwarding: `connection`, `keep-alive`, `transfer-encoding`, `te`, `trailer`, `upgrade`, `proxy-authorization`, `proxy-authenticate`, `host`
- Response shape — RAW upstream body stream + meta in headers:
  - Set response status to `200` (proxy success); upstream HTTP status conveyed via meta
  - Headers added by BE:
    - `X-Upstream-Status: <number>`
    - `X-Upstream-Status-Text: <string>`
    - `X-Upstream-Headers: <JSON.stringify(upstreamHeaders)>`
    - Pass through upstream `Content-Type` and `Content-Length` verbatim
  - Body: pipe upstream `body` stream to `reply.send(stream)` — no JSON envelope, no base64
- Expose `X-Upstream-*` headers via CORS `Access-Control-Expose-Headers`
- Network/DNS errors → 502 with `{ error, upstreamMessage }` JSON

## FE Changes

### Add deps
- `firebase` (JS SDK)

### New file: `src/services/firebase-auth.ts`
- Init Firebase app from `VITE_FIREBASE_*` env vars
- Export `signInWithGoogle()` — popup
- Export `signOut()`
- Export `getCurrentIdToken()` — wraps `auth.currentUser?.getIdToken()`
- Export `onAuthChange(cb)` — wraps `onAuthStateChanged`

### Update `src/services/http-client.ts` <!-- Updated: Validation S1 #1 + #5 -->
- Auto-detect localhost (see Phase 03 spec). Localhost branch: direct `fetch`, no token, no proxy.
- Remote branch (via `/proxy`):
  - `const token = await getCurrentIdToken().catch(() => null);`
  - If `token` → attach `Authorization: Bearer ${token}`
  - If no token → still call `/proxy` (BE may allow when `REQUIRE_AUTH=false`); on 401 surface friendly toast: "Sign in required to call remote APIs"

### Update `src/stores/settings-store.ts` or new `auth-store.ts`
- Track `user` (uid, email, displayName, photoURL) in memory
- Subscribe `onAuthChange` on app mount

### UI <!-- Updated: Validation S1 #1 - soft gate, no hard block -->
- Add sign-in button (Google) ở account page hoặc landing modal
- **Do NOT** hard-block Send button. Banner: "Sign in to call remote APIs" when signed out + URL is non-localhost.
- Localhost requests work without sign-in.
- Show user avatar + sign-out trong topbar when signed in

### `.env.example` additions
```
# FE
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_PROXY_URL=http://localhost:3001/proxy

# BE (backend/.env.example)
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
REQUIRE_AUTH=false
# When REQUIRE_AUTH=true, paste full service account JSON inline:
FIREBASE_SERVICE_ACCOUNT_JSON=
```

## Dev Workflow <!-- Updated: Validation S1 #6 - drop concurrently dep -->

Add to root `package.json`:
```json
"scripts": {
  "dev": "vite",
  "dev:be": "pnpm --filter backend dev",
  "dev:all": "pnpm -r --parallel run dev"
}
```

No new devDeps. Ensure `backend/package.json` has its own `dev` script (e.g. `tsx watch src/index.ts`) so `-r --parallel` picks it up alongside FE.

## Steps

1. Delete old `backend/src/`, `backend/drizzle/`, configs
2. Move service account JSON → `backend/.secrets/`, update `.gitignore`
3. Rewrite `backend/package.json` with minimal deps; `pnpm install`
4. Write `src/index.ts`, `src/auth.ts`, `src/proxy.ts`
5. Write `.env.example`, `Dockerfile`
6. Test BE locally:
   - `curl http://localhost:3001/health` → 200
   - `curl -X POST http://localhost:3001/proxy` no token → 401
7. Add `firebase` to FE deps
8. Create `src/services/firebase-auth.ts`
9. Update `src/services/http-client.ts` to attach token
10. Add sign-in UI + block-when-signed-out logic
11. Manual E2E: sign in → send request → verify upstream call works
12. Write minimal BE test: health + 401 unauth + valid proxy with mocked verify

## Todo
- [x] Delete old backend code (keep service account JSON only)
- [x] Delete on-disk service account JSON; add `*firebase-adminsdk*.json` to `.gitignore` <!-- Updated: Validation S1 #4 -->
- [x] New `backend/package.json` (5 deps)
- [x] Implement `backend/src/index.ts`
- [x] Implement `backend/src/auth.ts`
- [x] Implement `backend/src/proxy.ts`
- [x] `backend/Dockerfile` + `.env.example`
- [x] BE local smoke test (health + 401) — covered by unit tests
- [x] Add `firebase` FE dep (already present from Phase 02)
- [x] Implement `firebase-auth.ts`
- [x] Update `http-client.ts` to attach Bearer + 401 toast
- [x] Sign-in UI + sign-out + auth-state listener (AccountSettings + auth-store)
- [x] Soft gate: toast on 401, no hard block on Send
- [x] Add `dev:all` script using `pnpm -r --parallel run dev` (no `concurrently` dep) <!-- Updated: Validation S1 #6 -->
- [x] BE unit tests (health, 401, proxy with mocked verify) — 3/3 pass
- [ ] Manual E2E sign-in → send request → 200 (requires live Firebase project)

## Success Criteria
- `backend/src/` chỉ có 3 TS files
- BE total deps ≤ 5 (fastify, @fastify/cors, undici, firebase-admin, dotenv)
- `/health` accessible no auth
- `/proxy` returns 401 without Bearer **when `REQUIRE_AUTH=true`**
- `/proxy` accepts anonymous calls **when `REQUIRE_AUTH=false`** (Validation S1 #1)
- Valid Firebase ID token → upstream request forwarded successfully
- FE Google sign-in popup works end-to-end
- FE auto-routes `localhost`/`127.0.0.1` directly without proxy (Validation S1 #5)
- Binary upstream responses (e.g. image/png) returned intact via raw passthrough (Validation S1 #2)

## Risks
- **Service account leak:** ensure `.secrets/` in `.gitignore`; rotate immediately if leaked
- **Token expiry mid-request:** Firebase SDK refresh handled in `getIdToken()` (force refresh = false ok, SDK rotates)
- **Streaming large responses:** undici supports stream — wire `reply.send(stream)` or pipe
- **Hop-by-hop headers:** explicitly strip `connection`, `keep-alive`, `transfer-encoding`, `te`, `trailer`, `upgrade`, `proxy-*`
- **Allowed origins:** wildcard origin + credentials forbidden — enumerate FE domains
- **Firebase project config:** owner needs to enable Google sign-in provider in Firebase console (if not already)

## Next
Phase 05 docs + CI cleanup.
