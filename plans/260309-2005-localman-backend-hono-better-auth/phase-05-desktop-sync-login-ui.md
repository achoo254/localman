# Phase 05 — Desktop Client: Auth + Pull/Push Sync

## Context Links

- [Plan overview](./plan.md)
- [Phase 03 — Sync Endpoints](./phase-03-sync-endpoints-pull-push.md)
- Current client sync:
  - [src/types/sync.ts](../../src/types/sync.ts) — SyncConfig, SyncEndpoints, ServerFileEntry
  - [src/services/sync/sync-http-client.ts](../../src/services/sync/sync-http-client.ts) — listFiles, downloadFile, uploadFile, deleteFile
  - [src/services/sync/sync-service.ts](../../src/services/sync/sync-service.ts) — reconcile, syncAll, upload/download collections
  - [src/stores/sync-store.ts](../../src/stores/sync-store.ts) — Zustand sync state
  - [src/components/settings/sync-settings.tsx](../../src/components/settings/sync-settings.tsx) — Sync config UI

## Overview

- **Priority:** P1
- **Status:** complete
- **Effort:** 3h
- **Description:** Replace generic endpoint-based sync with Better Auth login + pull/push sync. Add login/register UI in Settings panel. Keep existing reconcile logic but adapt to new payload format.

## Key Insights

- Current client uses 4-endpoint model (list/download/upload/delete) with manual headers. New model: authenticate once, then pull/push with Bearer JWT
- Better Auth provides `@better-auth/react` client SDK — handles sign-up, sign-in, session state
- Tauri HTTP plugin already supports Bearer headers — no special handling needed
- The `reconcile()` function logic stays the same (LWW by `updated_at`), but calling code changes
- Environments are NOT currently synced — this phase adds environment sync support

## Requirements

### Functional

**Auth:**
- Login form (email + password) in Settings > Cloud Sync
- Register form (name + email + password) in Settings > Cloud Sync
- Google OAuth button (opens system browser for OAuth flow)
- Session persistence: store JWT in IndexedDB settings store
- Auto-attach JWT to all sync requests
- Logout button that clears token and sync state

**Sync:**
- Replace file-based sync with pull/push pattern
- On sync: pull server state, reconcile with local, push local changes
- Sync both collections AND environments
- Incremental sync using `lastSyncAt` as `since` parameter
- Show sync status: last synced, syncing, error

**UI:**
- Server URL input (e.g., `https://api.localman.app`)
- Login/Register toggle
- Logged-in state shows email + logout button
- "Sync Now" button triggers full sync
- Error messages displayed inline

### Non-Functional
- Auth state persists across app restarts
- Sync works offline-first: local changes always saved, synced when online
- No blocking UI during sync

## Architecture

### Auth Flow

```
User enters email/password
  │
  ▼
Better Auth client SDK
  ├── POST /api/auth/sign-in/email
  │   └── Returns: { token, user }
  │
  ├── Store JWT in Zustand + IndexedDB
  │
  └── All subsequent requests:
      Authorization: Bearer <jwt>
```

### Sync Flow (replacing current syncAll)

```
1. Pull: GET /api/sync/pull?since={lastSyncAt}
   └── Returns: { files: [...], serverTime }

2. Reconcile (client-side, existing LWW logic):
   For each local collection/environment:
     - If not on server → push (upload)
     - If server newer → apply server version (download)
     - If local newer → push (upload)
     - If equal → skip
   For each server file not local:
     - Import to local DB

3. Push: POST /api/sync/push
   Body: { changes: [...toUpload], deletions: [...toDelete] }
   └── Returns: { synced, deleted, serverTime }

4. Store serverTime as lastSyncAt
```

### New Type Definitions

```typescript
// Replace SyncConfig with:
interface CloudSyncConfig {
  enabled: boolean;
  serverUrl: string;    // e.g. "https://api.localman.app"
  token: string | null; // JWT from Better Auth
  lastSyncAt: string | null;
}

// Server response types
interface SyncPullResponse {
  files: Array<{
    filename: string;
    entityType: "collection" | "environment";
    content: unknown;
    updatedAt: string;
  }>;
  serverTime: string;
}

interface SyncPushPayload {
  changes: Array<{
    filename: string;
    entityType: "collection" | "environment";
    content: unknown;
    updatedAt: string;
  }>;
  deletions: string[];
}
```

## Related Code Files

### Create
- `src/services/sync/cloud-auth-client.ts` — Better Auth client wrapper for Tauri
- `src/services/sync/cloud-sync-service.ts` — Pull/push sync implementation
- `src/components/settings/cloud-login-form.tsx` — Login/register form component
- `src/types/cloud-sync.ts` — New sync types (CloudSyncConfig, pull/push payloads)

### Modify
- `src/stores/sync-store.ts` — Replace config model, add auth state, adapt syncAll
- `src/components/settings/sync-settings.tsx` — Replace endpoint inputs with login UI + server URL
- `src/types/sync.ts` — Add cloud sync types (or create new file)

### Keep (no changes needed)
- `src/services/sync/sync-service.ts` — Keep `reconcile()` function; deprecate old `syncAll()`
- `src/services/sync/sync-http-client.ts` — Keep for backward compat; new code uses cloud-sync-service

### Delete (after migration complete)
- None in Phase A — keep old code as fallback. Remove in Phase B.

## Implementation Steps

### 1. Install Better Auth client SDK

```bash
pnpm add better-auth
```

Note: `@better-auth/react` may not be needed. Better Auth's vanilla client works in any framework. Check docs — if React hooks needed, install `@better-auth/react`.

### 2. Create cloud sync types

`src/types/cloud-sync.ts`:

```typescript
export interface CloudSyncConfig {
  enabled: boolean;
  serverUrl: string;
  token: string | null;
  userEmail: string | null;
  userName: string | null;
  lastSyncAt: string | null;
}

export const CLOUD_SYNC_CONFIG_KEY = "cloud.sync.config";

export const DEFAULT_CLOUD_SYNC_CONFIG: CloudSyncConfig = {
  enabled: false,
  serverUrl: "",
  token: null,
  userEmail: null,
  userName: null,
  lastSyncAt: null,
};

export interface SyncFile {
  filename: string;
  entityType: "collection" | "environment";
  content: unknown;
  updatedAt: string;
}

export interface SyncPullResponse {
  files: SyncFile[];
  serverTime: string;
}

export interface SyncPushPayload {
  changes: SyncFile[];
  deletions: string[];
}

export interface SyncPushResponse {
  synced: number;
  deleted: number;
  serverTime: string;
}
```

### 3. Create cloud auth client

`src/services/sync/cloud-auth-client.ts`:

```typescript
import type { CloudSyncConfig } from "../../types/cloud-sync";

// Get Tauri fetch or browser fetch
async function getHttpClient() {
  if ((window as any).__TAURI__) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch;
  }
  return globalThis.fetch;
}

export async function signIn(
  serverUrl: string,
  email: string,
  password: string
): Promise<{ token: string; user: { email: string; name: string } }> {
  const f = await getHttpClient();
  const res = await f(`${serverUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Login failed: ${res.status}`);
  }
  return res.json();
}

export async function signUp(
  serverUrl: string,
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: { email: string; name: string } }> {
  const f = await getHttpClient();
  const res = await f(`${serverUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Registration failed: ${res.status}`);
  }
  return res.json();
}

export async function signOut(serverUrl: string, token: string): Promise<void> {
  const f = await getHttpClient();
  await f(`${serverUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

**Important:** The exact sign-in/sign-up response shape depends on Better Auth JWT plugin behavior. Verify during implementation:
- Does sign-in return `{ token }` directly? Or must you call a separate `/api/auth/get-session` endpoint?
- Does JWT plugin return the token in the response body or in a Set-Cookie header?
- Test with `curl` against running backend before writing client code.

### 4. Create cloud sync service

`src/services/sync/cloud-sync-service.ts`:

```typescript
import type {
  CloudSyncConfig,
  SyncFile,
  SyncPullResponse,
  SyncPushPayload,
  SyncPushResponse,
} from "../../types/cloud-sync";

async function getHttpClient() {
  if ((window as any).__TAURI__) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch;
  }
  return globalThis.fetch;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function pullFromServer(
  config: CloudSyncConfig
): Promise<SyncPullResponse> {
  if (!config.token) throw new Error("Not authenticated");
  const f = await getHttpClient();
  const url = new URL(`${config.serverUrl}/api/sync/pull`);
  if (config.lastSyncAt) url.searchParams.set("since", config.lastSyncAt);

  const res = await f(url.toString(), {
    method: "GET",
    headers: authHeaders(config.token),
  });

  if (res.status === 401) throw new Error("Session expired. Please login again.");
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
  return res.json();
}

export async function pushToServer(
  config: CloudSyncConfig,
  payload: SyncPushPayload
): Promise<SyncPushResponse> {
  if (!config.token) throw new Error("Not authenticated");
  const f = await getHttpClient();

  const res = await f(`${config.serverUrl}/api/sync/push`, {
    method: "POST",
    headers: authHeaders(config.token),
    body: JSON.stringify(payload),
  });

  if (res.status === 401) throw new Error("Session expired. Please login again.");
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
  return res.json();
}
```

### 5. Create reconcile + syncAll for pull/push

Update or extend `src/services/sync/sync-service.ts` — add a new `cloudSyncAll` function that:

1. Calls `pullFromServer(config)` to get server files
2. Loads all local collections + environments from IndexedDB
3. For each local item, build filename (`{id}.json` for collections, `env_{id}.json` for environments)
4. Run existing `reconcile(localUpdatedAt, serverUpdatedAt)` for each
5. Items marked `upload` → add to push changes array
6. Items marked `download` → apply server content to local DB
7. Server-only items → import to local DB
8. Local-only items → add to push changes array
9. Call `pushToServer(config, { changes, deletions: [] })`
10. Store `serverTime` as new `lastSyncAt`

**Key:** Keep the existing `reconcile()` function. It already does LWW comparison.

### 6. Update sync store

Modify `src/stores/sync-store.ts`:
- Replace `SyncConfig` with `CloudSyncConfig`
- Add `isAuthenticated`, `userEmail` computed from config
- Add `login(email, password)`, `register(name, email, password)`, `logout()` actions
- Replace `syncAll()` to use new cloud sync service
- Keep `testConnection()` adapted for new API (hit `/api/health`)

### 7. Create login form component

`src/components/settings/cloud-login-form.tsx`:

UI layout:
```
┌─────────────────────────────────────┐
│ Cloud Sync                          │
│                                     │
│ Server URL: [https://api.loca...]   │
│                                     │
│ ┌─ Login ──┬─ Register ─┐          │
│ │                         │          │
│ │ Email:    [............] │         │
│ │ Password: [............] │         │
│ │                         │          │
│ │  [Login]  or  [Google]  │          │
│ └─────────────────────────┘          │
│                                     │
│ --- (after login) ---               │
│                                     │
│ Logged in as: user@email.com        │
│ [Sync Now]  [Logout]               │
│ Last synced: 2026-03-09 12:00      │
└─────────────────────────────────────┘
```

- Toggle between Login and Register tabs
- Register shows additional "Name" field
- Google OAuth button (if server has Google configured)
- After login: show user email, Sync Now button, Logout
- Error messages inline below form

### 8. Update sync-settings.tsx

Replace current 4-endpoint input form with:
- Server URL input (single field)
- Login form component (from step 7)
- After auth: Sync Now button + last synced timestamp
- Keep "Enable Cloud Sync" toggle

### 9. Handle JWT persistence

Store JWT in IndexedDB settings:
```typescript
// On login success:
await settingsService.set(CLOUD_SYNC_CONFIG_KEY, {
  ...config,
  token: response.token,
  userEmail: response.user.email,
  userName: response.user.name,
});

// On app startup:
const config = await settingsService.get(CLOUD_SYNC_CONFIG_KEY);
if (config?.token) {
  // Try to validate token (call /api/health with auth header)
  // If 401 → clear token, show login
}
```

### 10. Handle Google OAuth in Tauri

Google OAuth requires browser redirect. In Tauri:

**Option A (Recommended):** Open system browser for OAuth, capture callback via localhost redirect.
```typescript
// 1. Open: https://api.localman.app/api/auth/sign-in/social?provider=google&callbackURL=http://localhost:3001/api/auth/callback/google
// 2. After OAuth, Better Auth redirects to callback with session
// 3. Client polls or uses Tauri deep link to receive token
```

**Option B:** Use Tauri WebView window for OAuth flow (more complex).

**Decision:** Implement Google OAuth as stretch goal. Email/password is primary for Phase A. Document OAuth approach for Phase B.

### 11. Test full flow

1. Start backend: `cd backend && pnpm dev`
2. Start frontend: `pnpm tauri dev`
3. Go to Settings > Cloud Sync
4. Enter server URL: `http://localhost:3001`
5. Register new account
6. Verify JWT stored
7. Create a collection in the app
8. Click "Sync Now"
9. Verify collection appears in server DB
10. Open second instance / modify server DB
11. Click "Sync Now" again — verify pull works

## Todo List

- [x] Install `better-auth` client SDK
- [x] Create `src/types/cloud-sync.ts`
- [x] Create `src/services/sync/cloud-auth-client.ts`
- [x] Create `src/services/sync/cloud-sync-service.ts` (pull + push)
- [x] Add `cloudSyncAll()` to sync-service.ts (or new file)
- [x] Update `src/stores/sync-store.ts` with auth state + new sync flow
- [x] Create `src/components/settings/cloud-login-form.tsx`
- [x] Update `src/components/settings/sync-settings.tsx` with new UI
- [x] Handle JWT persistence in IndexedDB
- [x] Add environment sync (export + import environments)
- [x] Test: register, login, logout
- [x] Test: push collections to server
- [x] Test: pull collections from server
- [x] Test: incremental sync with `since` parameter
- [x] Test: environment sync
- [x] Test: error handling (server down, invalid token, network error)

## Success Criteria

- User can register and login from Settings > Cloud Sync
- JWT token persists across app restarts
- "Sync Now" pushes local collections + environments to server
- "Sync Now" pulls server changes into local IndexedDB
- Incremental sync works (only syncs changes since last sync)
- Logout clears auth state
- Error messages display correctly (network errors, auth failures)
- Old file-based sync code still works if user configures it manually

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Better Auth JWT response shape differs from expected | High | Test with curl against running backend first |
| Tauri fetch + Authorization header issues | Low | Already works for API request builder |
| Environment export format not defined | Medium | Use simple JSON: `{ id, name, variables: [...] }` |
| Google OAuth in desktop app complexity | Medium | Defer to Phase B; email/password is MVP |
| Large collection sync timeout | Low | Incremental sync reduces payload |

## Security Considerations

- JWT stored in IndexedDB — acceptable for desktop app (OS-level security)
- Never log JWT tokens
- Clear token on logout
- Handle 401 responses gracefully (redirect to login)
- Google OAuth client secret stays on server — client only triggers redirect

## Unresolved Questions

1. **Better Auth JWT response format:** Does `/sign-in/email` return `{ token }` in body, or is token in Set-Cookie? Must verify during Phase 01-02 testing.
2. **Environment export format:** What shape should environment JSON take for server storage? Suggested: `{ id, name, variables: [{ key, value, enabled }], updated_at }`
3. **Google OAuth callback handling:** Use localhost redirect or Tauri deep link? Defer to Phase B.
4. **Token refresh:** Does Better Auth JWT plugin handle token refresh automatically, or must client implement refresh logic?

## Next Steps

After Phase 05, the full stack is operational:
- Backend running with auth + sync
- Desktop app can login + sync
- Future: Google OAuth, team workspaces, conflict UI
