# Code Review: Backend (Hono + Better Auth + Drizzle) & Cloud Sync Frontend

**Reviewer:** code-reviewer | **Date:** 2026-03-09
**Files:** 24 files (~1100 LOC) | **Focus:** Security, type safety, error handling, architecture

---

## Overall Assessment

Solid implementation. Clean separation of concerns, good use of Zod validation, proper transaction handling on sync push, and well-structured Hono middleware chain. Several security and robustness issues need attention before production.

---

## Critical Issues

### 1. [SECURITY] JWT token stored in IndexedDB in plaintext

**File:** `src/types/cloud-sync.ts` (line 8), `src/stores/sync-store.ts`

The `CloudSyncConfig.token` is persisted to IndexedDB via `settingsService.set()` as a plaintext string. Per the project's own CLAUDE.md spec: "Refresh token: IndexedDB settings store, **encrypted**."

**Impact:** Any XSS or malicious extension can read the token from IndexedDB.

**Fix:** Encrypt before storing, decrypt on read. At minimum, use the Tauri keychain/credential store for token storage instead of IndexedDB.

### 2. [SECURITY] CORS default is wildcard `*` with credentials enabled

**File:** `backend/src/app.ts` (lines 17-24), `backend/src/env.ts` (line 10)

```ts
cors({
  origin: env.CORS_ORIGINS === "*" ? "*" : env.CORS_ORIGINS.split(","),
  credentials: true, // <-- conflict with origin: "*"
})
```

Browsers reject `credentials: true` with `origin: "*"`. But if CORS_ORIGINS is set to a single domain, this works. The default `"*"` in env.ts creates a broken default for credentialed requests.

**Fix:** Default CORS_ORIGINS to `"http://localhost:1420"` (Tauri dev origin) in dev, require explicit config in prod. Add validation that `credentials: true` is not used with wildcard origin.

### 3. [SECURITY] No rate limiting on sync endpoints at app level

**File:** `backend/src/routes/sync.ts`

Nginx rate-limits auth endpoints but not sync endpoints. A compromised or malicious client can spam `/api/sync/push` with 10MB payloads, exhausting DB resources.

**Fix:** Add rate limiting middleware for sync routes (e.g., 10 req/min per user).

---

## High Priority

### 4. [SECURITY] Push endpoint lacks LWW conflict check -- allows stale overwrites

**File:** `backend/src/routes/sync.ts` (lines 74-91)

The `onConflictDoUpdate` always overwrites regardless of timestamps. A slow client with stale data can overwrite newer server data. The client reconciles locally, but if two clients sync simultaneously, the last push wins regardless of `updatedAt`.

**Fix:** Add a WHERE clause to onConflictDoUpdate:
```ts
.onConflictDoUpdate({
  target: [userFiles.userId, userFiles.filename],
  set: { ... },
  where: sql`${userFiles.updatedAt} < ${new Date(change.updatedAt)}`,
})
```

### 5. [ERROR HANDLING] Auth response shape mismatch with Better Auth

**File:** `src/services/sync/cloud-auth-client.ts` (lines 23-26, 44-45)

The `AuthResponse` interface expects `{ token, user: { id, email, name } }`. Better Auth's default sign-in response returns `{ session, token, user }` where `token` is the session token. If the JWT plugin changes the response shape, the client will silently get `undefined` for `token`.

**Fix:** Validate the response shape or use a Zod schema. Log a clear error if the expected fields are missing.

### 6. [TYPE SAFETY] Non-null assertion on user in sync routes

**File:** `backend/src/routes/sync.ts` (lines 34, 67)

```ts
const user = c.get("user")!;
```

While `requireAuth` guards these routes, the `!` assertion bypasses TypeScript's null check. If middleware ordering changes, this silently becomes a runtime error.

**Fix:** Add a runtime guard or use a helper that throws:
```ts
function getAuthUser(c: Context): AuthUser {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Unauthorized" });
  return user;
}
```

### 7. [PERFORMANCE] N+1 inserts in push endpoint

**File:** `backend/src/routes/sync.ts` (lines 74-93)

Each change and deletion runs a separate query inside the transaction. With 100+ items this becomes slow.

**Fix:** Batch inserts using `VALUES (...), (...), ...` or Drizzle's batch API. For deletions, use `IN (...)` clause.

### 8. [ERROR HANDLING] Zod parse errors return raw validation messages

**File:** `backend/src/routes/sync.ts` (lines 35, 68)

`pullQuerySchema.parse()` and `pushBodySchema.parse()` throw `ZodError` on invalid input, which gets caught by `errorHandler`. But `errorHandler` uses `err.message` which for ZodError is a long JSON string.

**Fix:** In `error-handler.ts`, detect ZodError and format nicely:
```ts
if (err instanceof ZodError) {
  return c.json({ error: "Validation failed", details: err.flatten() }, 400);
}
```

---

## Medium Priority

### 9. [DRY VIOLATION] `isTauri()` / `getHttpClient()` duplicated 6 times

**Files:** `cloud-auth-client.ts`, `cloud-sync-service.ts`, `sync-http-client.ts`, `http-client.ts`, `import-export-service.ts`, `docs-viewer-page.tsx`

The exact same `isTauri()` function is copy-pasted 6 times across the codebase.

**Fix:** Extract to `src/utils/tauri-helpers.ts` and import everywhere.

### 10. [ARCHITECTURE] Auth handler bypasses session middleware but returns raw Response

**File:** `backend/src/app.ts` (line 27)

```ts
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

This returns Better Auth's raw `Response` object. Hono's error handler won't catch errors from `auth.handler`. If Better Auth throws, the error propagates unhandled.

**Fix:** Wrap in try-catch:
```ts
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  try {
    return auth.handler(c.req.raw);
  } catch (err) {
    console.error("[Auth Error]", err);
    return c.json({ error: "Authentication service error" }, 500);
  }
});
```

### 11. [SECURITY] No input sanitization on `content` JSONB field

**File:** `backend/src/routes/sync.ts` (line 21)

```ts
content: z.record(z.string(), z.unknown()),
```

`z.unknown()` allows any nested structure including deeply nested objects that could cause DoS via JSON parsing or DB storage. No depth/size limit on JSONB content.

**Fix:** Add a content size check (e.g., `JSON.stringify(content).length < 5_000_000`) or use `z.any().refine()` with a max depth validator.

### 12. [EDGE CASE] `cloudSyncAll` saves `lastSyncAt` even on push failure

**File:** `src/services/sync/cloud-sync-service.ts` (lines 272-277)

If pull succeeds but push fails, `lastSyncAt` is still updated to `pullResponse.serverTime`. On next sync, the failed-to-push items won't be re-pulled (they're already local) but also won't be re-pushed because nothing tracks push failures.

**Fix:** Only update `lastSyncAt` after successful push, or track push failures separately.

### 13. [EDGE CASE] No deletion sync implemented

**File:** `src/services/sync/cloud-sync-service.ts` (line 264)

```ts
deletions: [], // always empty
```

Deletions are never synced. If user deletes a collection locally, it remains on the server and gets re-downloaded on next sync.

**Fix:** Track deletions (e.g., soft-delete with `deleted_at` in IndexedDB or a separate deletion log).

### 14. [SECURITY] Nginx config has no HTTPS

**File:** `backend/deploy/nginx.conf`

Listening on port 80 only. Auth credentials transmitted in plaintext. SSL section is commented out.

**Fix:** Uncomment SSL config, redirect HTTP to HTTPS. Mark as mandatory for production deployment.

### 15. [DB] No DB connection pooling config

**File:** `backend/src/db/client.ts`

```ts
const client = postgres(env.DATABASE_URL);
```

`postgres` (postgres.js) defaults to 10 connections max. For PM2 fork mode this is fine, but worth making configurable.

**Fix:** Add `max` option: `postgres(env.DATABASE_URL, { max: 10 })` for explicitness.

---

## Low Priority

### 16. `handleLogout` in CloudLoginForm doesn't wrap in try-catch

**File:** `src/components/settings/cloud-login-form.tsx` (lines 49-56)

If `logout()` throws after the try-catch in the store (unlikely but possible from `saveCloudSyncConfig`), `setLoading(false)` won't be called.

**Fix:** Wrap in try-finally.

### 17. `ecosystem.config.cjs` uses `max_size` and `retain` (PM2 log rotation)

**File:** `backend/ecosystem.config.cjs` (lines 18-19)

These require `pm2-logrotate` module installed separately. Without it, they're silently ignored.

**Fix:** Document the dependency or remove the options.

### 18. `setup.sh` has hardcoded password `CHANGE_ME`

**File:** `backend/deploy/setup.sh` (line 17)

Reference script, but someone may run it directly. Add a clear warning or use env var.

---

## Positive Observations

- Clean Zod env validation with defaults -- fail-fast on missing config
- Proper DB transaction for push upsert/delete atomicity
- Correct use of `onConflictDoUpdate` with unique index target
- Well-structured middleware chain: logger -> CORS -> auth handler -> session -> routes
- Body size limit on push endpoint (10MB)
- Good separation: auth-schema vs app-schema
- Frontend gracefully handles both legacy and cloud sync modes
- Error states well-presented in UI with proper ARIA roles

---

## Recommended Actions (Priority Order)

1. **Encrypt token** in IndexedDB or use Tauri credential store
2. **Fix CORS** default -- no wildcard with credentials
3. **Add server-side LWW** check in push endpoint WHERE clause
4. **Validate/format ZodError** responses in error handler
5. **Extract `isTauri()`** to shared utility (DRY)
6. **Add rate limiting** to sync endpoints
7. **Fix `lastSyncAt`** to only update after full sync success
8. **Implement deletion sync** or document as known limitation
9. **Batch push queries** for performance
10. **Require HTTPS** in production nginx config

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | ~85% (good, some `unknown` casts in sync helpers) |
| Test Coverage | 0% (no tests for backend or cloud-sync frontend) |
| Linting Issues | Not run (new package, needs lint setup) |
| Security Issues | 5 (2 critical, 3 medium) |
| DRY Violations | 1 major (isTauri x6) |

---

## Unresolved Questions

1. Does Better Auth's JWT plugin return `token` at the top level of sign-in response, or nested under `session.token`? The frontend `AuthResponse` interface assumes top-level -- needs verification against actual Better Auth v1.5.4 response.
2. Is there a plan for token refresh? Current implementation stores a single token with no refresh mechanism -- if it expires, user must re-login.
3. Should the backend enforce a max number of `userFiles` per user to prevent abuse?
