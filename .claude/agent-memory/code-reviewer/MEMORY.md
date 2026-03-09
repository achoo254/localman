# Code Reviewer Memory - Localman

## Project Structure
- **Frontend:** Tauri + React + TypeScript + Vite (root `src/`)
- **Backend:** Hono + Better Auth + Drizzle + PostgreSQL (`backend/src/`)
- **Monorepo:** pnpm workspace with `backend` package
- **DB:** IndexedDB (Dexie.js) on frontend, PostgreSQL on backend

## Known DRY Issues
- `isTauri()` function duplicated 6+ times across frontend codebase (should be in `src/utils/tauri-helpers.ts`)

## Security Patterns
- Token stored in IndexedDB plaintext -- flagged for encryption/Tauri keychain
- CORS default is `*` in backend env -- problematic with `credentials: true`
- No rate limiting on sync endpoints at app level (only nginx auth rate limit)

## Sync Architecture
- Cloud sync: pull/push model with LWW reconciliation on client
- Server is "dumb JSON store" -- no server-side LWW enforcement (flagged)
- Deletions not synced (always empty array) -- known gap
- Legacy 4-endpoint sync mode still supported alongside cloud mode

## Conventions
- Zod for env validation and request body validation
- Hono middleware chain: logger -> CORS -> auth handler -> session -> routes
- Better Auth with JWT plugin for auth
- PM2 + Nginx for deployment
