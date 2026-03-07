---
title: Phase 01 — Functional Bugs
status: pending
priority: P1
---

# Phase 01 — Functional Bugs

## Issues

### F1 — Status bar always shows "Offline"
**File:** `src/components/layout/status-bar.tsx`
- Network detection logic always returns offline even after successful HTTP request
- Root cause: likely uses `navigator.onLine` which doesn't reflect real connectivity in Tauri WebView, or event listeners not wired
- **Fix:** Use Tauri network plugin event OR track online state by watching if last HTTP request succeeded. Simplest: listen to `window` `online`/`offline` events AND set online=true after any successful `executeHttp` call.

### F2 — Header suggestion buttons don't insert rows
**File:** `src/components/request/headers-tab.tsx`
- Quick-suggestion buttons (Content-Type, Accept, etc.) click handler doesn't add a new row to the key-value table
- **Fix:** Read the file, find the suggestion button handler, ensure it calls the `addRow` / `onChange` callback with the suggested key pre-filled

### F3 — Default names are random numbers
**Files:** `src/db/services/request-service.ts`, `src/db/services/collection-service.ts`
- New request/collection names default to random UUIDs or numbers (e.g. `234`)
- **Fix:** Change default name in `create()` to `"New Request"` / `"Untitled Collection"` with a numeric suffix if name already exists (e.g. `"New Request 2"`)

### F4 — Ctrl+T shortcut not implemented
**File:** Find AppLayout or main keyboard handler
- Shortcut listed in shortcuts modal but no handler registered
- **Fix:** Add `Ctrl+T` (+ `Meta+T`) keydown handler in the same location as `Ctrl+/`, calling `openNewTab()` or equivalent new-request action

## Files to Modify
- `src/components/layout/status-bar.tsx`
- `src/components/request/headers-tab.tsx`
- `src/db/services/request-service.ts`
- `src/db/services/collection-service.ts`
- App-level keyboard handler (find by searching for `Ctrl+/` handler)

## Todo
- [ ] F1: Fix network online/offline detection
- [ ] F2: Fix header suggestion button onClick
- [ ] F3: Default names "New Request" / "Untitled Collection"
- [ ] F4: Add Ctrl+T handler

## Success Criteria
- Status bar shows "Online" after successful request
- Clicking suggestion adds pre-filled header row
- New request/collection shows meaningful default name
- Ctrl+T opens new request tab
