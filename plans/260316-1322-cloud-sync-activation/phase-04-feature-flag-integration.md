---
phase: 4
priority: high
effort: M
status: done
depends_on: [1, 2, 3]
---

# Phase 4: Feature Flag Flip + Integration Smoke Test

## Context
- `FEATURES.CLOUD_SYNC = false` gates all sync UI and behavior
- Flipping requires verifying all gated paths work correctly
- Backend must be deployed and reachable

## Related Files
- `src/utils/feature-flags.ts` — flip flag
- `src/components/layout/sync-status-indicator.tsx` — ungated
- `src/components/settings/sync-settings.tsx` — ungated
- `src/components/layout/app-layout.tsx` — `loadConfig()` gated

## Pre-requisites
- Backend deployed with sync API routes accessible
- Firebase project configured with Google OAuth
- `.env` has `VITE_API_BASE_URL` and Firebase config

## Implementation Steps

1. Set `CLOUD_SYNC: true` in `feature-flags.ts`
2. Verify all gated code paths compile: `pnpm type-check`
3. Smoke test checklist:
   - [ ] App loads without errors
   - [ ] Account settings shows "Sign in with Google"
   - [ ] Google login flow completes
   - [ ] Sync status indicator shows in titlebar
   - [ ] Manual sync triggers pull+push
   - [ ] Create collection → appears in `pending_changes`
   - [ ] Save request → appears in `pending_changes`
   - [ ] Update environment → appears in `pending_changes`
   - [ ] `syncAll()` pushes pending changes to backend
   - [ ] Pull receives remote changes
   - [ ] Logout clears pending changes and disconnects WS

4. Fix any runtime errors discovered
5. Run full test suite: `pnpm test`

## Risk
- Firebase config missing → clear error message needed
- Backend unreachable → app should degrade to offline mode gracefully
- Dormant type errors in sync services → fix during this phase

## Success Criteria
- [ ] Feature flag ON, app runs without crashes
- [ ] Full sync round-trip works (create→push→pull on another instance)
- [ ] Offline mode still works when backend unavailable
- [ ] All tests pass
