# Localman

Offline-first web API client. Runs in your browser. Optional self-hosted proxy for CORS bypass + Firebase Google sign-in.

## Architecture

```
Browser (SPA)
  └── IndexedDB (Dexie.js) — source of truth, offline-first
  └── Firebase JS SDK — Google sign-in, ID token in memory
  └── fetch → /proxy → Fastify backend → target URL (CORS bypass)

Fastify Backend (optional, ~150 LoC)
  └── POST /proxy — forward requests via undici
  └── firebase-admin — verify ID token (when REQUIRE_AUTH=true)
  └── REQUIRE_AUTH=false → no Firebase needed
```

## Prerequisites

- **Node.js** v20+ and **pnpm**
- Firebase project (for Google sign-in) — optional if `REQUIRE_AUTH=false`

## Project Layout

This repo is a pnpm workspace with two packages:

```
client/    # web SPA (React + Vite + Dexie + Firebase JS SDK)
backend/   # optional Fastify proxy + firebase-admin verify
docs/      # documentation
plans/     # implementation plans
```

There is no root `package.json`. All scripts run via `pnpm --filter <pkg>` or from inside the package dir.

## Setup

```bash
pnpm install
cp client/.env.example client/.env            # Firebase config + proxy URL
cp backend/.env.example backend/.env          # REQUIRE_AUTH, FIREBASE_SERVICE_ACCOUNT_JSON
pnpm -r --parallel run dev                    # starts client (Vite :5173) + backend (Fastify :3001)
```

> **Note:** If you are upgrading from a previous desktop/Tauri version, existing local IndexedDB data will be wiped on first run due to the schema migration.

## Environment Variables

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_PROXY_URL` | Backend proxy URL (default: `http://localhost:3001/proxy`) |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Port to listen on (default: `3001`) |
| `ALLOWED_ORIGINS` | Comma-separated FE origins (e.g. `http://localhost:5173`) |
| `REQUIRE_AUTH` | `true` or `false` — set `false` to skip Firebase entirely |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account JSON (single-line) |

## Firebase Setup (optional — skip if `REQUIRE_AUTH=false`)

1. Go to [Firebase Console](https://console.firebase.google.com) → create/select project
2. Authentication → Sign-in method → enable **Google** provider
3. Project settings → Your apps → Web → copy config values into `client/.env`
4. Project settings → Service accounts → Generate new private key → paste JSON into `backend/.env` as `FIREBASE_SERVICE_ACCOUNT_JSON`

## Self-Host Without Firebase

Set `REQUIRE_AUTH=false` in `backend/.env`. The proxy will forward requests without authentication. Leave all `VITE_FIREBASE_*` variables empty — sign-in UI will be hidden.

## Development Commands

```bash
pnpm -r --parallel run dev          # client + backend concurrently
pnpm --filter client dev            # client only (Vite)
pnpm --filter backend dev           # backend only (Fastify)
pnpm --filter client build          # build client → client/dist
pnpm --filter client lint           # ESLint
pnpm --filter client type-check     # TypeScript check
pnpm --filter client test           # Vitest unit tests
pnpm --filter backend build         # compile backend
pnpm --filter backend test          # backend tests
```

## Testing & CI

**CI (GitHub Actions):** On every push, lint, type-check, and tests run for both frontend and backend (see `.github/workflows/`).

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Radix UI + Dexie.js + Zustand + Firebase JS SDK
- **Backend:** Node.js + Fastify + undici + firebase-admin
- **Storage:** IndexedDB (browser-native, no server DB)
