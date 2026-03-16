---
phase: 3
priority: high
effort: S
status: done
---

# Phase 3: Auto-Sync on Reconnect

## Context
- Currently no auto-sync when network reconnects
- `pending_changes` accumulate but never auto-flush
- Need: listen `online` event → debounced `syncAll()`

## Related Files
- `src/stores/sync-store.ts` — add auto-sync logic
- `src/utils/feature-flags.ts` — gate behind `CLOUD_SYNC`

## Implementation Steps

1. In `sync-store.ts` `loadConfig()`, add `online` event listener:
   ```ts
   window.addEventListener('online', () => {
     const { config, status } = get()
     if (config.enabled && status !== 'syncing') {
       // Debounce 2s to avoid rapid-fire
       setTimeout(() => get().syncAll(), 2000)
     }
   })
   ```

2. Clean up listener on logout (store cleanup ref)

3. Add periodic sync option (optional, low priority):
   - Every 5 min if authenticated and online
   - Gated behind `config.autoSync` setting (default: true)
   - Clear interval on logout

4. Run `pnpm type-check`

## Success Criteria
- [ ] `syncAll()` fires automatically when going online→offline→online
- [ ] Debounced (no rapid-fire on flaky connections)
- [ ] Listener cleaned up on logout
- [ ] No sync attempts when `CLOUD_SYNC` is false
