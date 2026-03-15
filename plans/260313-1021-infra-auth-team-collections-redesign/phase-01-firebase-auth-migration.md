# Phase 1: Firebase Auth Migration

## Context

- [Brainstorm report](../reports/brainstorm-260313-0914-infra-auth-team-collections-redesign.md)
- [plan.md](./plan.md)

## Overview

- **Priority:** P1 (Critical — all other phases depend on this)
- **Status:** Completed
- **Effort:** 8h
- **Description:** Replace Better Auth with Firebase Auth (Google Login only). Clean slate — no user migration.

## Key Insights

- Better Auth is ~31 lines config + 52 lines schema + 25 lines middleware + routes in app.ts
- Frontend cloud-auth-client.ts (81 lines) wraps Better Auth HTTP calls → replace entirely
- sync-store.ts (252 lines) handles login/register/logout → simplify to Firebase token flow
- cloud-login-form.tsx (198 lines) has email/password tabs → replace with Google Login button
- Firebase Admin SDK (BE) verifies ID tokens; Firebase Client SDK (FE) handles popup/redirect
- Offline: no auth needed. Firebase SDK auto-refreshes when online

## Validation Decisions

- **Tauri popup**: Try popup first, switch to redirect flow if blocked
- **BE credentials**: Service account JSON file (GOOGLE_APPLICATION_CREDENTIALS env var)
- **DB migration**: Drop all Better Auth tables, create new users table. Clean slate
- **Auth restore on reload**: Accept 1-2s delay, show loading spinner while Firebase restores state
- **FK references**: workspaces.ownerId, workspace_members.userId will reference new user.id — migration drops all data

## Requirements

### Functional
- User can sign in via Google popup (web + Tauri)
- Backend verifies Firebase ID token on every request
- User record upserted in PostgreSQL on first login (firebase_uid, email, name, avatar)
- Logout clears token from memory, disconnects WS
- All existing workspace/sync routes continue working with new auth

### Non-Functional
- Token stored in memory only (not IndexedDB/localStorage)
- Offline mode works without any auth
- Firebase Spark tier (free) sufficient

## Architecture

```
FE → Firebase SDK → Google popup → ID Token (memory)
FE → API request + Authorization: Bearer <firebase-id-token>
BE → firebase-admin.verifyIdToken() → uid, email, name, picture
BE → upsert user (PostgreSQL) → attach to request context
BE → proceed with route handler
```

## Related Code Files

### Backend — Delete
- `backend/src/auth.ts` (31 lines) — Better Auth config → **delete entirely**
- `backend/src/db/auth-schema.ts` (52 lines) — Better Auth tables → **replace with simple user table**

### Backend — Modify
- `backend/src/app.ts` (54 lines) — Remove Better Auth handler, add Firebase middleware
- `backend/src/middleware/auth-guard.ts` (25 lines) — Rewrite: verify Firebase ID token
- `backend/src/env.ts` (16 lines) — Replace AUTH_SECRET/GOOGLE_* with FIREBASE_PROJECT_ID (or service account JSON path)
- `backend/package.json` — Remove `better-auth`, add `firebase-admin`

### Backend — Create
- `backend/src/firebase.ts` (~20 lines) — Firebase Admin SDK init
- `backend/drizzle/migrations/XXXX_firebase_auth.sql` — Migration: drop Better Auth tables, create simple users table

### Frontend — Delete
- `src/services/sync/cloud-auth-client.ts` (81 lines) — Better Auth HTTP wrapper → **delete entirely**

### Frontend — Modify
- `src/stores/sync-store.ts` (252 lines) — Replace login/register/logout with Firebase SDK calls
- `src/types/cloud-sync.ts` (47 lines) — Remove email/password fields, simplify CloudSyncConfig
- `src/components/settings/cloud-login-form.tsx` (198 lines) — Replace with Google Login button component
- `src/components/settings/sync-settings.tsx` (67 lines) — Simplify (remove server URL, update login form usage)
- `src/stores/workspace-store.ts` (165 lines) — Update token retrieval (Firebase currentUser.getIdToken())

### Frontend — Create
- `src/services/sync/firebase-auth-client.ts` (~40 lines) — Firebase SDK init + Google sign-in helper

### Config
- Firebase project setup (console.firebase.google.com) — Enable Google provider
- `src/firebase-config.ts` (~10 lines) — Firebase client config (apiKey, authDomain, projectId)

## Implementation Steps

### 1. Firebase Project Setup
1. Create Firebase project on console.firebase.google.com
2. Enable Google sign-in provider in Authentication section
3. Get config: apiKey, authDomain, projectId
4. Download service account JSON for backend (or note projectId for env var)
5. Add authorized domains: localhost, your-domain.app

### 2. Backend — Remove Better Auth
1. `pnpm remove better-auth` from backend/package.json
2. Delete `backend/src/auth.ts`
3. Remove Better Auth handler from `backend/src/app.ts` (the `app.on(["POST","GET"], "/api/auth/*", ...)` route)
4. Remove `sessionMiddleware` import and usage from app.ts

### 3. Backend — Add Firebase Admin
1. `pnpm add firebase-admin` in backend/
2. Create `backend/src/firebase.ts`:
   ```ts
   import { initializeApp, cert } from 'firebase-admin/app'
   import { getAuth } from 'firebase-admin/auth'

   // Init with service account JSON (GOOGLE_APPLICATION_CREDENTIALS env var)
   const app = initializeApp({
     credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
   })
   export const firebaseAuth = getAuth(app)
   ```
3. Update `backend/src/env.ts`: add `FIREBASE_SERVICE_ACCOUNT` (required, JSON string), remove `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### 4. Backend — Rewrite Auth Middleware
1. Rewrite `backend/src/middleware/auth-guard.ts`:
   ```ts
   import { createMiddleware } from 'hono/factory'
   import { firebaseAuth } from '../firebase'
   import { db } from '../db/client'
   import { users } from '../db/user-schema'
   import { eq } from 'drizzle-orm'

   export const firebaseAuthMiddleware = createMiddleware(async (c, next) => {
     const authHeader = c.req.header('Authorization')
     if (!authHeader?.startsWith('Bearer ')) {
       c.set('user', null)
       return next()
     }
     try {
       const token = authHeader.slice(7)
       const decoded = await firebaseAuth.verifyIdToken(token)
       // Upsert user
       const [user] = await db.insert(users).values({
         firebaseUid: decoded.uid,
         email: decoded.email ?? '',
         name: decoded.name ?? '',
         avatarUrl: decoded.picture ?? null,
       }).onConflictDoUpdate({
         target: users.firebaseUid,
         set: { email: decoded.email, name: decoded.name, avatarUrl: decoded.picture, updatedAt: new Date() }
       }).returning()
       c.set('user', user)
     } catch {
       c.set('user', null)
     }
     return next()
   })

   export const requireAuth = createMiddleware(async (c, next) => {
     if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401)
     return next()
   })
   ```

### 5. Backend — User Schema
1. Replace `backend/src/db/auth-schema.ts` with `backend/src/db/user-schema.ts`:
   ```ts
   import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

   export const users = pgTable('users', {
     id: uuid('id').primaryKey().defaultRandom(),
     firebaseUid: text('firebase_uid').notNull().unique(),
     email: text('email').notNull(),
     name: text('name').notNull().default(''),
     avatarUrl: text('avatar_url'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   })
   ```
2. Create Drizzle migration: drop old Better Auth tables (user, session, account, verification), create new `users` table
3. Update any references from `auth-schema.ts` to `user-schema.ts`

### 6. Backend — Update App.ts
1. Remove Better Auth imports and handler
2. Add `firebaseAuthMiddleware` globally (replaces sessionMiddleware)
3. Keep workspace routes, sync routes, health routes unchanged
4. Update CORS origins if needed

### 7. Frontend — Install Firebase SDK
1. `pnpm add firebase` in root package.json
2. Create `src/firebase-config.ts`:
   ```ts
   import { initializeApp } from 'firebase/app'
   import { getAuth } from 'firebase/auth'

   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
   }

   const app = initializeApp(firebaseConfig)
   export const auth = getAuth(app)
   ```

### 8. Frontend — Create Firebase Auth Client
1. Create `src/services/sync/firebase-auth-client.ts`:
   ```ts
   import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
   import { auth } from '../../firebase-config'

   const googleProvider = new GoogleAuthProvider()

   export async function signInWithGoogle() {
     const result = await signInWithPopup(auth, googleProvider)
     return result.user
   }

   export async function firebaseSignOut() {
     await signOut(auth)
   }

   export function getCurrentUser() {
     return auth.currentUser
   }

   export async function getIdToken(): Promise<string | null> {
     const user = auth.currentUser
     if (!user) return null
     return user.getIdToken()
   }
   ```
2. Delete `src/services/sync/cloud-auth-client.ts`

### 9. Frontend — Update Sync Store
1. In `src/stores/sync-store.ts`:
   - Remove `login(email, password)` and `register(email, password)` methods
   - Add `loginWithGoogle()` method using Firebase SDK
   - Replace token management: use `getIdToken()` from Firebase (auto-refreshes)
   - Remove `serverUrl` from config (handled in Phase 2, but prep here)
   - Keep workspace subscription, full sync, WS connection logic
   - On `loginWithGoogle()`: sign in → get token → load workspaces → connect WS

### 10. Frontend — Update Cloud Sync Types
1. In `src/types/cloud-sync.ts`:
   - Remove `serverUrl` from `CloudSyncConfig` (or mark optional, final removal in Phase 2)
   - Remove email/password related types if any
   - Add `firebaseUser` type reference

### 11. Frontend — Replace Login Form
1. Rewrite `src/components/settings/cloud-login-form.tsx`:
   - Remove email/password tabs and register form
   - Add single "Sign in with Google" button
   - Show authenticated user info (name, email, avatar from Firebase user)
   - Add "Sign out" button
   - Keep sync button for manual sync trigger

### 12. Frontend — Update Workspace Store
1. In `src/stores/workspace-store.ts`:
   - Replace `config.token` usage with `getIdToken()` calls
   - Replace `config.serverUrl` with `getApiBaseUrl()` (prep for Phase 2)

### 13. Compile & Test
1. Backend: `cd backend && pnpm build` — verify no compile errors
2. Frontend: `pnpm type-check` — verify no TS errors
3. Frontend: `pnpm lint` — verify no lint errors
4. Test login flow: Google popup → token → API call → user created in DB
5. Test offline: app works without auth
6. Test WS: connect after login, disconnect after logout

## Todo List

- [x] Create Firebase project + enable Google provider
- [x] Backend: remove better-auth, add firebase-admin
- [x] Backend: create firebase.ts init
- [x] Backend: rewrite auth-guard middleware
- [x] Backend: replace auth-schema with user-schema
- [x] Backend: update app.ts (remove BA handler, add Firebase middleware)
- [x] Backend: update env.ts
- [x] Backend: create Drizzle migration
- [x] Frontend: install firebase SDK
- [x] Frontend: create firebase-config.ts
- [x] Frontend: create firebase-auth-client.ts
- [x] Frontend: delete cloud-auth-client.ts
- [x] Frontend: update sync-store.ts
- [x] Frontend: update cloud-sync.ts types
- [x] Frontend: rewrite cloud-login-form.tsx
- [x] Frontend: update workspace-store.ts
- [x] Frontend: update sync-settings.tsx
- [x] Compile check (BE + FE)
- [x] Test login flow end-to-end

## Success Criteria

- Google Login works on web browser
- Google Login works in Tauri desktop app
- Backend verifies Firebase ID token, upserts user
- Existing workspace/sync routes work with new auth
- Offline mode: full local functionality without auth
- No Better Auth remnants in codebase

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Firebase popup blocked in Tauri WebView | Medium | Use redirect flow as fallback |
| Token verification latency | Low | Firebase Admin caches public keys |
| Google OAuth consent screen delays | Low | Use "testing" mode initially |

## Security Considerations

- Firebase ID tokens expire in 1 hour, auto-refreshed by SDK
- Token in memory only — never persisted to disk/IndexedDB
- Backend always verifies token before processing (no trust of client)
- Service account key (if used) must be in .env, never committed
- HTTPS required for production (Nginx TLS termination)

## Next Steps

- After this phase: proceed to Phase 2 (Server URL Removal + Deployment)
- Firebase project config values needed before implementation
