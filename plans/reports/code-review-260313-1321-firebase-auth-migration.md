# Code Review: Firebase Auth Migration, Server URL Removal & Sidebar Sections

**Date:** 2026-03-13
**Scope:** 3 phases across ~40 files (backend + frontend)
**Focus:** Security, type safety, error handling, memory leaks, offline behavior

---

## Overall Score: 7/10

Solid migration from Better Auth to Firebase. Clean separation of concerns. Good offline-first patterns preserved. Several security and robustness issues need attention.

---

## Critical Issues

### C1. Firebase service account parsed with non-null assertion, no try/catch
**File:** `backend/src/firebase.ts:6`
```ts
credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
```
If env var is malformed JSON, the entire server crashes on startup with an unhelpful `SyntaxError`. The Zod validation in `env.ts` only checks `z.string().min(10)` -- it does not validate JSON structure.

**Fix:** Wrap in try/catch or add a Zod `.transform(JSON.parse)` with `.refine()` in env.ts to fail fast with a clear error:
```ts
FIREBASE_SERVICE_ACCOUNT: z.string().min(10).transform((s) => {
  try { return JSON.parse(s) } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON') }
}),
```

### C2. `as any` cast in auth-guard hides type mismatch
**File:** `backend/src/middleware/auth-guard.ts:36`
```ts
c.set('user', user as any)
```
The Drizzle `.returning()` result type does not match `AuthUser` (Drizzle returns `InferSelectModel<typeof users>` with `Date | null` for timestamps, but `AuthUser` declares `Date | null` -- the id field is `string` in both, so it works at runtime). The `as any` silently hides if schema drifts. Use `satisfies AuthUser` or map explicitly to catch mismatches at compile time.

### C3. CORS `origin: *` fallback still ships with `credentials: true`
**File:** `backend/src/app.ts:22-29`, `backend/src/env.ts:7`

When `CORS_ORIGINS === '*'`, the code maps to a fixed list of 3 dev origins, which is reasonable. However, the `CORS_ORIGINS` default is `'*'` in env.ts -- if deployed without setting this var, the Hono `cors()` middleware receives those 3 origins (safe). But the name `*` as default is misleading and error-prone. A developer reading env.ts would assume wildcard CORS is the default.

**Fix:** Change default to empty string or `'http://localhost:1420'` and handle accordingly, or rename to `CORS_ORIGINS_DEV_FALLBACK`.

### C4. WebSocket token in query string is logged by proxies
**File:** `src/services/sync/websocket-manager.ts:116`
```ts
const url = `${getWsBaseUrl()}/ws?token=${encodeURIComponent(this.token)}`;
```
Firebase ID tokens in URL query params appear in nginx access logs, browser history, and any proxy logs. This is a known security anti-pattern (OWASP).

**Mitigation options:**
1. Send token in first WS message after connection (server validates on first frame)
2. Use a short-lived one-time ticket endpoint: POST /api/ws-ticket -> ticket UUID, then WS connects with ticket

---

## High Priority (Should Fix)

### H1. Auth listener never cleaned up on logout
**File:** `src/stores/sync-store.ts:73,102-103`

`authUnsubscribe` is set during `loadConfig()` but `logout()` does not call `authUnsubscribe?.()`. If user logs out and back in, `loadConfig()` calls `authUnsubscribe?.()` before re-subscribing, but only if `loadConfig()` is re-called after logout. If it is not, the old Firebase `onAuthStateChanged` listener leaks.

**Fix:** Add `authUnsubscribe?.(); authUnsubscribe = null;` to `logout()`.

### H2. DB upsert on every authenticated request is expensive
**File:** `backend/src/middleware/auth-guard.ts:22-35`

Every single authenticated API call executes an `INSERT ... ON CONFLICT DO UPDATE` against PostgreSQL. Under load, this is unnecessary -- the user row changes rarely (name/avatar update).

**Fix:** Use a simple SELECT first, only upsert on first-seen or if `email/name/picture` changed. Or cache `firebaseUid -> userId` in memory with a TTL.

### H3. Stale token on reconnect
**File:** `src/services/sync/websocket-manager.ts:17,45-53`

The token is stored as `this.token` once during `connect()`. Firebase ID tokens expire after 1 hour. If the WS disconnects after 1hr and auto-reconnects, it reuses the stale token. The server will reject it.

**Fix:** Make `doConnect()` async and fetch a fresh token via `getIdToken()` before each reconnection attempt. Store a token-fetcher function instead of the token string.

### H4. `isAuthenticated` in `CollectionsTabSections` calls store method on every render
**File:** `src/components/collections/collections-tab-sections.tsx:38`
```ts
const isAuthenticated = useSyncStore(s => s.isAuthenticated());
```
This invokes `getCurrentUser()` on every render via selector. Since `isAuthenticated` is a method (not state), Zustand cannot detect changes -- it will always re-render. This should be derived from `config.enabled && config.userEmail !== null` (which IS reactive state) or stored as a boolean in the store.

### H5. `as any` scattered across merge-engine (13 occurrences in backend)
**Files:** `backend/src/services/merge-engine.ts`, `backend/src/routes/collection-routes.ts`, `backend/src/routes/entity-sync-routes.ts`

Multiple `as any` casts around Drizzle query results and insert payloads. These hide real type errors when schema changes.

---

## Medium Priority (Suggestions)

### M1. `handleLogout` has no try/catch around `setLoading(false)`
**File:** `src/components/settings/cloud-login-form.tsx:37-41`
```ts
const handleLogout = async () => {
  setLoading(true)
  await logout()      // if this throws, setLoading(false) never runs
  setLoading(false)
}
```
Should use `finally` like `handleGoogleLogin` does.

### M2. `listWorkspaces` response parsing duplicated
`firebase-auth-client.ts:36-49` and `workspace-store.ts:39-59` both implement HTTP request + auth header + error parsing. The `apiRequest` helper in workspace-store is good -- `listWorkspaces` in firebase-auth-client should use it too.

### M3. No rate limiting on sync push endpoint at app level
**File:** `backend/src/app.ts:33`

`bodyLimit` is applied to sync/push, but nginx only rate-limits `/api/auth/`. A malicious or buggy client could spam `/api/sync/push` with large payloads.

### M4. `buildTree` called N+1 times for N workspaces
**File:** `src/components/collections/collections-tab-sections.tsx:46-52`

Folders and requests are passed to every `buildTree` call even if they belong to a different workspace's collection. The function filters internally, but this is O(workspaces * entities). For small N this is fine; at scale, pre-group by workspace_id.

### M5. `sidebar-tabs.tsx` exceeds 300 lines
**File:** `src/components/collections/sidebar-tabs.tsx` (339 lines)

Contains dialog state management for 5+ dialogs, all callback handlers, and the tab layout. Consider extracting dialog management into a custom hook `useSidebarDialogs()`.

### M6. `wsCollapsed` state lost on re-render/navigation
**File:** `src/components/collections/collections-tab-sections.tsx:31`

Personal and workspace collapse states are `useState` -- not persisted. If user navigates away and back, all sections re-expand. Consider persisting alongside `sidebar_expanded` in IndexedDB.

---

## Low Priority

### L1. nginx listens on port 80 only (no HTTPS)
**File:** `backend/deploy/nginx.conf:8`

Acceptable if TLS is terminated at load balancer. Document this assumption.

### L2. `error_file` in PM2 config uses absolute path
**File:** `backend/ecosystem.config.cjs:17-18`

Fine for single-server deploy. Just noting for portability.

### L3. Firebase config uses only 3 fields
**File:** `src/firebase-config.ts`

`apiKey`, `authDomain`, `projectId` -- this is correct for auth-only usage. No issue.

---

## Positive Observations

- Clean migration: Better Auth fully removed, Firebase Admin SDK properly used for server-side token verification
- `getApiBaseUrl()` centralizes URL resolution -- good DRY improvement over previous `serverUrl` in config
- `requireAuth` middleware cleanly separated from `firebaseAuthMiddleware` (extract-then-guard pattern)
- Offline-first preserved: all writes go to IndexedDB first, sync queue is non-blocking
- WebSocket manager has proper exponential backoff and channel re-subscription on reconnect
- Section-based sidebar is well-structured with clean component decomposition
- `CollectionSectionHeader` is a good small, focused component
- Zod env validation catches config errors at startup
- `workspace_invites` table has token expiry and acceptance tracking

---

## Unresolved Questions

1. Is `loadConfig()` guaranteed to be called after a logout+re-login flow? If not, H1 (auth listener leak) is confirmed.
2. The `CORS_ORIGINS === '*'` branch maps to 3 hardcoded dev origins -- is this intentional for production deploys where CORS_ORIGINS would always be set explicitly?
3. Is there a plan to migrate the WS auth from query-string token to a more secure method (C4)?
4. The `pending_sync` table mentioned in CLAUDE.md as "Phase 2, not yet in DB schema" -- is the `offline-change-queue` the replacement? If so, docs should be updated.
