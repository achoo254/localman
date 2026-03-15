---
phase: 04
title: Cloud UI "Coming Soon" State
priority: medium
status: completed
effort: low
completed: 2026-03-13
---

# Phase 04: Cloud UI "Coming Soon" State

## Context
- Cloud components: `cloud-login-form.tsx` (152 lines), `sync-settings.tsx` (48 lines)
- App layout calls `loadConfig()` + `syncAll()` on mount (lines 92-101)
- Workspace selector in sidebar
- No cloud backend deployed for Phase 1

## Overview

Disable cloud features, show "Coming Soon" labels. Keep components visible so users know features are planned. Prevent sync/auth attempts.

## Related Code Files

**Modify:**
- `src/components/settings/cloud-login-form.tsx` — disable login, show "Coming Soon"
- `src/components/settings/sync-settings.tsx` — disable sync toggle, show "Coming Soon"
- `src/components/layout/app-layout.tsx` — skip `loadConfig()` / `syncAll()` calls
- `src/components/settings/account-workspaces-settings.tsx` — disable workspace creation

**Consider:**
- Sidebar sync status indicator — hide or show "Coming Soon"
- Any sync-related buttons in titlebar

## Implementation Steps

1. **Add feature flag:**
   ```ts
   // src/utils/feature-flags.ts (new file, simple)
   export const FEATURES = {
     CLOUD_SYNC: false, // Enable in Phase 2
   } as const;
   ```

2. **Guard cloud-login-form.tsx:**
   - If `!FEATURES.CLOUD_SYNC`: render disabled Google login button + "Coming Soon" badge
   - No auth requests attempted

3. **Guard sync-settings.tsx:**
   - If `!FEATURES.CLOUD_SYNC`: disable sync toggle, show "Cloud sync coming soon" text
   - Skip `loadConfig()` call

4. **Guard app-layout.tsx:**
   - If `!FEATURES.CLOUD_SYNC`: skip `loadConfig()` + `syncAll()` on mount
   - Prevents any network requests to cloud backend

5. **Guard workspace UI:**
   - Disable "Create Workspace" button
   - Show tooltip "Coming Soon"

## Todo List

- [x] Create `src/utils/feature-flags.ts` with `CLOUD_SYNC: false`
- [x] Guard cloud-login-form with feature flag
- [x] Guard sync-settings with feature flag
- [x] Skip loadConfig/syncAll in app-layout when flag off
- [x] Disable workspace creation UI
- [x] Add "Coming Soon" badge/text to disabled sections
- [x] Verify app starts without any cloud network requests
- [x] Verify no console errors from disabled cloud features

## Success Criteria

- Zero network requests to cloud backend on app start
- Cloud features visually present but clearly disabled
- "Coming Soon" label on login, sync, workspace sections
- No console errors from uninitialized cloud services
