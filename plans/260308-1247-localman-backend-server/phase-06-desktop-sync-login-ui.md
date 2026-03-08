# Phase 06: Desktop App Sync Login UI

<!-- Updated: Validation Session 1 - Added as new phase based on auth UX decision -->

## Context
- Plan: [plan.md](./plan.md)
- Requires: Phase 03 (auth endpoints running), Phase 04 (sync endpoints running)
- Modifies: Tauri desktop app (`src/`) — NOT the backend

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 4h
- **Description:** Add sync server login form to desktop app Settings panel. User enters backend URL + credentials once; app auto-fetches JWT token and stores it in SyncConfig headers. Eliminates manual header configuration.

## Key Insights
- Current UX: user must manually add `Authorization: Bearer {token}` to SyncConfig headers → bad UX
- Better UX: login form → app stores `Authorization` header automatically
- Access token stored in memory; refresh token handled via httpOnly cookie (backend)
- On app restart: try refresh endpoint; if fails, show login form again
- **Scope:** Only Settings UI update + token storage logic in existing sync-store. No new stores needed.

## Requirements
**Functional:**
- Login form: server URL, email, password fields
- On login success: store access token in `SyncConfig.headers` as `Authorization: Bearer {token}`
- On login fail: show error toast
- Show "Logged in as {email}" with logout button when authenticated
- Auto-refresh token on 401 response from sync endpoints
- Logout: call `/api/auth/logout`, clear token from headers

**Non-functional:**
- No token stored in IndexedDB (only server URL + email in config for display)
- Access token memory-only (cleared on app close)
- On app restart: prompt re-login (no auto-refresh for Phase A simplicity)

## Architecture

```
Settings Panel (Sync tab)
  └── SyncLoginForm component
        ├── If not logged in: URL + email + password fields + Login button
        └── If logged in: "Logged in as {email} on {server}" + Logout button

SyncConfig (IndexedDB settings):
  headers: [{ key: "Authorization", value: "Bearer {token}" }]
  // token written here after login; cleared on logout
```

## Related Code Files

**Modify:**
- `src/components/settings/sync-settings.tsx` — add SyncLoginForm section
- `src/stores/sync-store.ts` — add login/logout actions
- `src/types/sync.ts` — add `serverUrl`, `userEmail` optional fields to SyncConfig
- `src/services/sync/sync-http-client.ts` — add 401 handler that triggers re-auth

**Create:**
- `src/components/settings/sync-login-form.tsx` — login form component

## Implementation Steps

1. **Update SyncConfig type** (`src/types/sync.ts`)
   - Add optional `serverUrl: string`, `userEmail: string` to `SyncConfig`
   - These are used for display only (not auth)

2. **Create SyncLoginForm component** (`src/components/settings/sync-login-form.tsx`)
   ```tsx
   // Props: onLogin(serverUrl, email, password) → Promise<void>
   // State: serverUrl, email, password, loading, error
   // On submit: call onLogin, show error toast on fail
   ```

3. **Add login/logout to sync-store** (`src/stores/sync-store.ts`)
   ```typescript
   // login(serverUrl, email, password): POST {serverUrl}/api/auth/login
   //   → on success: update SyncConfig.headers with Authorization header
   //   → update SyncConfig.endpoints to point to serverUrl
   //   → save config, set userEmail in config
   // logout(): POST {serverUrl}/api/auth/logout (best-effort)
   //   → remove Authorization header from SyncConfig.headers
   //   → clear userEmail from config
   ```

4. **Update sync settings UI** (`src/components/settings/sync-settings.tsx`)
   - Add SyncLoginForm at top of Sync settings tab
   - Show logged-in state vs login form based on `config.userEmail`
   - Endpoints auto-derived from serverUrl:
     ```
     list: {serverUrl}/api/sync/list
     download: {serverUrl}/api/sync/download/{filename}
     upload: {serverUrl}/api/sync/upload/{filename}
     delete: {serverUrl}/api/sync/delete/{filename}
     ```
   - Keep manual endpoint override as advanced option (collapsible)

5. **Handle 401 in sync-http-client** (`src/services/sync/sync-http-client.ts`)
   - On 401 response: set sync status to error with message "Session expired — please log in again"
   - Do NOT auto-retry (keep simple for Phase A)

## Todo

- [ ] Update `SyncConfig` type with `serverUrl`, `userEmail` fields
- [ ] Create `sync-login-form.tsx` component
- [ ] Add `login()` and `logout()` actions to `sync-store.ts`
- [ ] Update `sync-settings.tsx` to show login form / logged-in state
- [ ] Auto-populate endpoints when login succeeds
- [ ] Handle 401 → show "session expired" error in sync-http-client
- [ ] Test: login → sync → logout flow
- [ ] Test: 401 from server shows clear error

## Success Criteria
- [ ] User can log in with email/password → sync works without manual header setup
- [ ] Logged-in state persists across sync settings re-opens (within same session)
- [ ] Logout clears credentials and shows login form
- [ ] 401 response shows clear error message "Session expired — please log in again"
- [ ] Endpoints auto-configured from server URL

## Risk Assessment
| Risk | Mitigation |
|---|---|
| Access token lost on app restart | Show login form again — acceptable for Phase A |
| Server URL misconfigured | Validate URL format; test connection button |
| 401 loop | Only handle 401 once per sync, no retry |

## Security Considerations
- Access token: only in memory (Zustand store) and SyncConfig headers (IndexedDB for persistence across settings panel re-opens)
- Password: never stored, only sent once to login endpoint
- httpOnly cookie for refresh token handled by browser/Tauri automatically

## Next Steps
- Phase B: Implement token auto-refresh on startup (store email for display, refresh cookie auto-sent)
- Phase C: SSO / OAuth for team workspaces
