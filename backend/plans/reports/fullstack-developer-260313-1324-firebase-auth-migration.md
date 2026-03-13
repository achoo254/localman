# Phase Implementation Report

### Executed Phase
- Phase: Firebase Auth Migration (Phase 1)
- Plan: D:\CONG VIEC\localman\plans\260313-1021-infra-auth-team-collections-redesign\
- Status: completed

### Files Modified

**Backend (D:\CONG VIEC\localman\backend\)**
- `package.json` — removed better-auth dep, removed auth:generate script; added firebase-admin
- `src/firebase.ts` — CREATED: Firebase Admin SDK init
- `src/auth.ts` — DELETED
- `src/env.ts` — replaced AUTH_SECRET/AUTH_URL/GOOGLE_* with FIREBASE_SERVICE_ACCOUNT
- `src/app.ts` — replaced Better Auth handler + sessionMiddleware with firebaseAuthMiddleware
- `src/middleware/auth-guard.ts` — replaced sessionMiddleware with firebaseAuthMiddleware + Firebase token verification + PG upsert
- `src/types/context.ts` — replaced Better Auth inferred types with explicit AuthUser (firebaseUid, avatarUrl)
- `src/db/auth-schema.ts` — DELETED
- `src/db/user-schema.ts` — CREATED: new users table (uuid PK, firebase_uid, email, name, avatar_url)
- `src/db/schema.ts` — updated import/re-export from auth-schema → user-schema; userId column text→uuid
- `src/db/client.ts` — updated schema import from auth-schema → user-schema
- `src/db/workspace-schema.ts` — updated import from auth-schema → user-schema; all user FK columns text→uuid
- `src/db/entity-schema.ts` — updated import from auth-schema → user-schema; all userId columns text→uuid
- `src/ws/ws-auth.ts` — replaced Better Auth session validation with Firebase verifyIdToken + DB lookup

**Frontend (D:\CONG VIEC\localman\src\)**
- `package.json` — added firebase SDK
- `src/firebase-config.ts` — CREATED: Firebase app + auth init from VITE_* env vars
- `src/services/sync/firebase-auth-client.ts` — CREATED: Google sign-in, token management, listWorkspaces
- `src/services/sync/cloud-auth-client.ts` — DELETED
- `src/types/cloud-sync.ts` — removed token field, added userAvatar field
- `src/stores/sync-store.ts` — replaced login/register with loginWithGoogle; Firebase onAuthChanged listener; getIdToken() for WS connect
- `src/stores/workspace-store.ts` — updated apiRequest to use getIdToken() instead of config.token
- `src/services/sync/entity-sync-service.ts` — replaced config.token with getIdToken()
- `src/services/sync/conflict-queue.ts` — replaced config.token with getIdToken()
- `src/services/sync/offline-queue-replay.ts` — replaced config.token with getIdToken()
- `src/services/sync/ws-event-handler.ts` — replaced config.token check with getCurrentUser()
- `src/components/settings/cloud-login-form.tsx` — replaced email/password form with Google sign-in button
- `src/components/settings/sync-settings.tsx` — removed server URL input, simplified to auth + sync trigger
- `src/components/settings/account-workspaces-settings.tsx` — replaced login/register form with Google sign-in button; added authLoading state; removed server URL input
- `src/components/sync/conflict-resolution-dialog.tsx` — removed token from config prop type; fixed handleApply guard
- `src/components/layout/app-layout.tsx` — config.token → config.userEmail check

### Tasks Completed
- [x] Install firebase-admin, remove better-auth (backend)
- [x] Create firebase.ts (Admin SDK init)
- [x] Delete auth.ts
- [x] Create user-schema.ts (users table with firebaseUid)
- [x] Rewrite auth-guard.ts (Firebase token verification + PG upsert)
- [x] Update context.ts types
- [x] Update env.ts (FIREBASE_SERVICE_ACCOUNT)
- [x] Update app.ts
- [x] Fix all auth-schema/better-auth references in backend (schema.ts, client.ts, workspace-schema.ts, entity-schema.ts, ws-auth.ts)
- [x] Remove auth:generate script from package.json
- [x] Install firebase SDK (frontend)
- [x] Create firebase-config.ts
- [x] Create firebase-auth-client.ts
- [x] Delete cloud-auth-client.ts
- [x] Update cloud-sync.ts types
- [x] Rewrite sync-store.ts (loginWithGoogle, onAuthChanged)
- [x] Rewrite cloud-login-form.tsx
- [x] Rewrite sync-settings.tsx
- [x] Update workspace-store.ts (getIdToken())
- [x] Update entity-sync-service.ts (getIdToken())
- [x] Fix conflict-queue.ts, offline-queue-replay.ts, ws-event-handler.ts
- [x] Fix conflict-resolution-dialog.tsx, account-workspaces-settings.tsx, app-layout.tsx

### Tests Status
- Type check backend: pass (tsc --noEmit clean)
- Type check frontend: pass (tsc --noEmit clean)
- Unit tests: not run (no test suite for auth layer)

### Issues Encountered
- workspace-schema.ts and entity-schema.ts had FK columns typed as `text` referencing old `user.id` (text PK). New `users.id` is `uuid` — updated all FK columns to `uuid` type for schema consistency.
- `schema.ts` had a stale re-export of Better Auth tables (user, session, account, verification) — replaced with re-export of `users` only.
- Additional files beyond the original task list needed token fixes: conflict-queue, offline-queue-replay, ws-event-handler, conflict-resolution-dialog, account-workspaces-settings, app-layout.

### Next Steps
- Phase 2: Server URL Removal + Deployment Config (hardcode server URL, remove from UI)
- Drizzle migration SQL needed before deploying (clean slate schema push: `pnpm db:push`)
- Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID to frontend .env
- Add FIREBASE_SERVICE_ACCOUNT to backend .env (JSON-stringified service account)
