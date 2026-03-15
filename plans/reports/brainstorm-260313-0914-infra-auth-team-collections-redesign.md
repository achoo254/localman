---
type: brainstorm
date: 2026-03-13
slug: infra-auth-team-collections-redesign
status: finalized
---

# Brainstorm: Infra, Auth & Team Collections Redesign

## Problem Statement

Localman needs infrastructure restructuring:
- BE bundled to 1 JS file, deployed on cloud, runs via pm2
- FE web app served by Nginx on same server, reverse proxy to BE
- FE Tauri desktop runs locally on user machine
- Current Server URL config in Settings unnecessary → remove
- Auth: migrate from email/password (Better Auth) to Google Login (Firebase Auth)
- Team collections: workspace feature backend-ready but no clear UI flow

## Decisions (Finalized)

| Aspect | Decision | Rationale |
|---|---|---|
| Auth | Firebase Auth, Google Login only | Simpler than Better Auth, no email/password mgmt |
| Migration | Clean slate | Early stage, no prod users |
| Sidebar UX | Sections (Personal + Team) | Both visible at once, no switching |
| Offline | Local-only mode | Offline = no auth needed, auth only for sync |
| Firebase | New project, Spark (free) tier | Free tier sufficient for Google Auth |
| Multi-account | Single account | Logout/login to switch. YAGNI |
| Domain | Same domain | FE at `/`, BE at `/api/*`. Simple Nginx config |

## Architecture

```
Cloud Server (single domain, e.g. localman.app):
  Nginx → serves FE static files at /
        → reverse proxy /api/* → BE (localhost:3001)
  BE: Node.js (Hono) + pm2, single bundled JS file
  DB: PostgreSQL

External: Firebase Auth (Google Login, new Spark project)

User Machine:
  Tauri Desktop App (offline-first, local-only when offline)
  API URL: VITE_API_URL build-time env
  Auth: Firebase SDK → token sent to BE only when online + syncing
```

## Key Changes

### 1. Auth: Better Auth → Firebase Auth

**Remove:**
- Better Auth package + all routes (`/api/auth/*`)
- Session middleware (`sessionMiddleware`, `requireAuth`)
- Auth schema tables (user/session/account/verification from Better Auth)
- `cloud-login-form.tsx` (email/password form)
- Google OAuth config in Better Auth (GOOGLE_CLIENT_ID/SECRET)

**Add:**
- `firebase-admin` (BE): verify ID tokens
- `firebase` client SDK (FE): Google login popup
- New auth middleware: verify Firebase ID token → extract uid/email/name → upsert user
- Google Login button component (replaces login form)

**Keep:**
- PostgreSQL `users` table (simplified: id, firebase_uid, email, name, avatar_url, timestamps)
- Workspace RBAC middleware (unchanged, still checks user from DB)

**Flow:**
```
FE → Firebase SDK → Google popup → ID Token
FE → stores token in memory (not IndexedDB for security)
FE → API request + Authorization: Bearer <firebase-id-token>
BE → firebase-admin verifyIdToken() → uid, email, name, picture
BE → upsert user in PostgreSQL by firebase_uid
BE → attach user to request context → proceed
```

**Offline behavior:**
- No auth needed offline — all local features work without token
- When online: Firebase SDK auto-refreshes token
- If token expired + offline: app works locally, sync paused until online
- On reconnect: Firebase SDK refreshes token automatically, sync resumes

### 2. Server URL Removal

**Remove:**
- `serverUrl` field from `CloudSyncConfig` type
- Server URL input from `sync-settings.tsx`
- Manual server URL entry in `cloud-login-form.tsx`

**Replace with:**
- Web app: relative URLs (`/api/...`) — same-origin, no config needed
- Tauri desktop: `VITE_API_URL` env var at build time
- Helper: `getApiBaseUrl()` → returns `VITE_API_URL || ''` (empty = relative)

**Impact:**
- `sync-store.ts`: remove `serverUrl` from config, use `getApiBaseUrl()`
- `workspace-store.ts`: same change
- `entity-sync-service.ts`: same change
- `websocket-manager.ts`: derive WS URL from API base URL

### 3. Team Collections UX — Sidebar Sections

**Layout:**
```
Sidebar
├── PERSONAL
│   ├── Collection A
│   └── Collection B
├── TEAM: "Workspace Name"
│   ├── Collection C
│   └── Collection D
└── + Create Collection (context-aware)
```

**Behavior:**
- Personal section: always visible, shows collections with `workspace_id = null`
- Team section(s): visible when logged in + member of workspace(s)
- Each team section collapsible, shows workspace name as header
- "Create Collection" button: creates in currently focused section context
- Right-click collection → "Move to Workspace..." → workspace picker
- Right-click collection → "Move to Personal" (sets `workspace_id = null`)
- Workspace management (create/invite/leave) via Settings or header dropdown

**Backend:** Already supports `workspace_id` on collections — no backend changes needed for basic flow.

### 4. Deployment

**Nginx config (same domain):**
```nginx
server {
    listen 80;
    server_name localman.app;

    # FE static files
    root /var/www/localman/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # BE reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**PM2 ecosystem.config.cjs:**
```js
module.exports = {
  apps: [{
    name: 'localman-api',
    script: 'dist/index.js',
    env_file: '.env',
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
  }]
}
```

**Build pipeline:**
- FE: `pnpm build` → `dist/` (Vite)
- BE: `pnpm run build` → `dist/index.js` (esbuild single bundle)
- Tauri: `pnpm tauri build` with `VITE_API_URL=https://localman.app`

## Implementation Phases (Reordered)

### Phase 1: Firebase Auth Migration (Priority: HIGH)
- Setup Firebase project (Spark tier, enable Google provider)
- BE: remove Better Auth, add firebase-admin, new auth middleware
- BE: simplify user schema (firebase_uid based)
- FE: add Firebase client SDK, Google Login button
- FE: update sync-store to use Firebase token
- FE: remove cloud-login-form, replace with Google Login
- Test: login flow on both Web + Tauri

### Phase 2: Server URL Removal + Deployment Config (Priority: MEDIUM)
- Remove `serverUrl` from types, stores, settings UI
- Add `getApiBaseUrl()` utility
- Update all API call sites to use new base URL
- Create/update nginx.conf for same-domain serving
- Create ecosystem.config.cjs for PM2
- Update build scripts with `VITE_API_URL` for Tauri

### Phase 3: Sidebar Workspace Sections (Priority: MEDIUM)
- Restructure sidebar to show Personal + Team sections
- Filter collections by `workspace_id` (null = personal)
- Context-aware "Create Collection"
- Right-click context menu: Move to Workspace / Move to Personal
- Workspace header with member count/presence

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Firebase vendor lock-in | Low | Auth layer abstracted; can swap provider later |
| Firebase free tier limits | Very Low | Spark tier: unlimited auth, sufficient |
| Offline sync complexity | Medium | Local-only mode = simple. No auth offline |
| Sidebar UX confusion | Low | Clear section headers, collapse/expand |

## Success Metrics

- Google Login works on Web + Tauri (popup flow)
- No server URL config needed from user
- Sidebar clearly shows Personal vs Team collections
- Offline mode: full local functionality without auth
- Single `pnpm build` + deploy script for production

## Next Steps

Proceed to implementation planning with `/plan` if approved.
