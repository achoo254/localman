# Phase 2: Server URL Removal + Deployment Config

## Context

- [plan.md](./plan.md)
- [Phase 1](./phase-01-firebase-auth-migration.md)
- Depends on Phase 1 completion (Firebase auth must work first)

## Overview

- **Priority:** P2
- **Status:** Completed
- **Effort:** 4h
- **Description:** Remove manual server URL config. Web uses relative URLs, Tauri uses VITE_API_URL. Update nginx + pm2 configs.

## Key Insights

- sync-settings.tsx has a server URL text input — remove it
- CloudSyncConfig.serverUrl used in sync-store, workspace-store, entity-sync-service, websocket-manager
- Same-domain deployment: FE at `/`, BE at `/api/*` → web needs no URL config
- Tauri desktop: `VITE_API_URL` injected at build time
- Nginx config already exists at `backend/deploy/nginx.conf` — needs update for static FE serving
- PM2 ecosystem.config.cjs doesn't exist yet — create it

## Requirements

### Functional
- Web app: all API calls use relative URLs (`/api/...`)
- Tauri desktop: API calls use `VITE_API_URL` env var
- No "Server URL" input visible in Settings
- Nginx serves FE static files + reverse proxies to BE
- PM2 manages BE process with auto-restart

### Non-Functional
- Single domain deployment (no CORS complexity)
- WebSocket URL derived from API base URL (ws:// or wss://)

## Related Code Files

### Frontend — Modify
- `src/types/cloud-sync.ts` — Remove `serverUrl` from CloudSyncConfig
- `src/stores/sync-store.ts` — Replace `config.serverUrl` with `getApiBaseUrl()`
- `src/stores/workspace-store.ts` — Same replacement
- `src/services/sync/entity-sync-service.ts` — Same replacement
- `src/services/sync/websocket-manager.ts` — Derive WS URL from API base
- `src/components/settings/sync-settings.tsx` — Remove server URL input
- `src/components/settings/cloud-login-form.tsx` — Remove serverUrl references

### Frontend — Create
- `src/utils/api-base-url.ts` (~10 lines) — `getApiBaseUrl()` utility

### Backend — Modify
- `backend/deploy/nginx.conf` — Add FE static file serving + SPA fallback
- `backend/deploy/setup.sh` — Update for same-domain deployment

### Backend — Create
- `backend/ecosystem.config.cjs` (~15 lines) — PM2 process config

## Implementation Steps

### 1. Create API Base URL Utility
1. Create `src/utils/api-base-url.ts`:
   ```ts
   /** Returns API base URL. Empty string for same-origin (web), full URL for Tauri desktop. */
   export function getApiBaseUrl(): string {
     return import.meta.env.VITE_API_URL ?? ''
   }

   /** Derives WebSocket URL from API base. */
   export function getWsBaseUrl(): string {
     const base = getApiBaseUrl()
     if (!base) {
       // Same-origin: derive from current page
       const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
       return `${proto}//${location.host}`
     }
     return base.replace(/^http/, 'ws')
   }
   ```

### 2. Remove serverUrl from Types
1. In `src/types/cloud-sync.ts`: remove `serverUrl` field from `CloudSyncConfig`
2. Update default config: remove `serverUrl: ""`

### 3. Update Stores
1. `src/stores/sync-store.ts`:
   - Import `getApiBaseUrl` from utility
   - Replace all `config.serverUrl` usages with `getApiBaseUrl()`
   - Remove `serverUrl` from `saveConfig()` / `loadConfig()`
   - Update WS connection to use `getWsBaseUrl()`

2. `src/stores/workspace-store.ts`:
   - Import `getApiBaseUrl`
   - Replace `config.serverUrl` with `getApiBaseUrl()`

### 4. Update Sync Services
1. `src/services/sync/entity-sync-service.ts`:
   - Replace server URL parameter/config with `getApiBaseUrl()`

2. `src/services/sync/websocket-manager.ts`:
   - Replace server URL with `getWsBaseUrl()`

### 5. Update Settings UI
1. `src/components/settings/sync-settings.tsx`:
   - Remove server URL text input and its state
   - Keep login form and manual sync button

2. `src/components/settings/cloud-login-form.tsx`:
   - Remove any serverUrl references (if not already done in Phase 1)

### 6. Update Nginx Config
1. Update `backend/deploy/nginx.conf`:
   ```nginx
   server {
       listen 80;
       server_name localman.app;

       # Frontend static files
       root /var/www/localman/frontend/dist;
       index index.html;

       # SPA fallback
       location / {
           try_files $uri $uri/ /index.html;
       }

       # API reverse proxy
       location /api/ {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Auth rate limiting
       location /api/auth/ {
           limit_req zone=auth burst=10 nodelay;
           proxy_pass http://127.0.0.1:3001;
       }
   }
   ```

### 7. Create PM2 Config
1. Create `backend/ecosystem.config.cjs`:
   ```js
   module.exports = {
     apps: [{
       name: 'localman-api',
       script: 'dist/index.js',
       env_file: '.env',
       instances: 1,
       autorestart: true,
       max_memory_restart: '512M',
       env: { NODE_ENV: 'production' },
     }]
   }
   ```

### 8. Update Build Scripts
1. In `backend/package.json`, verify/add:
   - `"start:prod": "node --env-file=.env dist/index.js"`
   - `"pm2:start": "pm2 start ecosystem.config.cjs"`
   - `"pm2:stop": "pm2 stop localman-api"`

### 9. Compile & Test
1. `pnpm type-check` — verify no TS errors
2. `pnpm lint`
3. Test web: API calls use relative URLs
4. Test Tauri: API calls use VITE_API_URL
5. Verify no `serverUrl` references remain in UI

## Todo List

- [x] Create `src/utils/api-base-url.ts`
- [x] Remove `serverUrl` from CloudSyncConfig type
- [x] Update sync-store.ts
- [x] Update workspace-store.ts
- [x] Update entity-sync-service.ts
- [x] Update websocket-manager.ts
- [x] Update sync-settings.tsx (remove server URL input)
- [x] Update cloud-login-form.tsx
- [x] Update nginx.conf for same-domain
- [x] Create ecosystem.config.cjs
- [x] Update backend package.json scripts
- [x] Compile check + test

## Success Criteria

- No "Server URL" input in Settings UI
- Web app API calls use relative paths
- `VITE_API_URL` env var works for Tauri builds
- Nginx config serves FE + proxies BE on same domain
- PM2 config starts BE correctly

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tauri WebView relative URL issues | Low | VITE_API_URL always set for Tauri builds |
| WS URL derivation edge cases | Low | getWsBaseUrl() handles both origins |

## Security Considerations

- CORS simplified: same-origin = no CORS issues for web
- Tauri: CORS_ORIGINS env must include Tauri WebView origin
- Nginx headers: X-Frame-Options, X-Content-Type-Options set

## Next Steps

- After this phase: proceed to Phase 3 (Sidebar Workspace Sections)
