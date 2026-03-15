# Code Reviewer Memory - Localman

## Project Structure
- **Frontend:** Tauri + React + TypeScript + Vite (root `src/`)
- **Backend:** Hono + Firebase Admin SDK + Drizzle + PostgreSQL (`backend/src/`)
- **Monorepo:** pnpm workspace with `backend` package
- **DB:** IndexedDB (Dexie.js) on frontend, PostgreSQL on backend

## Known DRY Issues
- `isTauri()` function duplicated 6+ times across frontend codebase (should be in `src/utils/tauri-helpers.ts`)
- `listWorkspaces` in firebase-auth-client duplicates HTTP+auth pattern already in workspace-store's `apiRequest`

## Security Patterns
- Token stored in IndexedDB plaintext -- flagged for encryption/Tauri keychain
- CORS default is `*` in backend env -- maps to 3 dev origins, but naming is misleading
- No rate limiting on sync endpoints at app level (only nginx auth rate limit)
- WS auth token passed in query string -- visible in proxy/nginx logs (OWASP anti-pattern)

## Sync Architecture
- Cloud sync: entity-level pull/push with delta sync and field-level merge engine
- Server has normalized entity tables (collections, folders, requests, environments, change_log)
- WebSocket for real-time sync with exponential backoff reconnect
- Offline change queue replaces legacy pending_sync

## Auth
- Firebase Auth: Google Login via popup (frontend), Firebase Admin SDK token verification (backend)
- Better Auth fully removed as of 2026-03-13
- Auth middleware: extract token -> verify -> upsert user (every request -- flagged as expensive)
- `onAuthStateChanged` listener set in loadConfig() -- not cleaned up on logout (flagged)

## Conventions
- Zod for env validation and request body validation
- Hono middleware chain: logger -> CORS -> firebase auth -> routes
- PM2 + Nginx for deployment
- `getApiBaseUrl()` centralizes server URL (replaced per-config serverUrl)
