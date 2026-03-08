# Code Review: Draft Tab / New Request Feature

## Scope
- **Files**: 8 files reviewed (request-store, use-auto-save, response-store, request-panel, request-tab-bar, save-request-dialog, sidebar-tabs, App.tsx)
- **LOC**: ~600 lines across all files
- **Focus**: Draft lifecycle, state sync, edge cases, memory, security

## Overall Assessment

Solid implementation. Draft lifecycle is well-designed: drafts live in Zustand memory, skip auto-save and history logging, and persist only on explicit save. The `draft_` prefix convention for IDs is simple and effective. A few issues found, one critical.

---

## Critical Issues

### 1. Ctrl+T conflict: two competing handlers create different request types

**File**: `src/components/layout/app-layout.tsx` lines 87-98
**File**: `src/components/request/request-panel.tsx` lines 53-55

Both files register `Ctrl+T` keydown handlers. `app-layout.tsx` calls `createNewRequest()` (persists to DB immediately), while `request-panel.tsx` calls `createDraftTab()` (in-memory only). The `app-layout` handler fires first since it's higher in the DOM. When `RequestPanel` is mounted, both handlers run. The `e.preventDefault()` in `app-layout` does NOT stop propagation to other listeners on the same target (`window`).

**Impact**: Every Ctrl+T creates a persisted request AND a draft tab simultaneously, polluting the DB with empty requests and opening two tabs.

**Fix**: Remove the Ctrl+T handler from `app-layout.tsx` entirely (lines 87-98). The `request-panel.tsx` handler is the correct one. If `RequestPanel` is not mounted (no tabs open), the "+" button in `RequestTabBar` or the empty-state button in `RequestPanel` still works.

Alternatively, if you need Ctrl+T to work globally (even when no panel is mounted), move it to `app-layout.tsx` but change it to call `createDraftTab()` instead of `createNewRequest()`.

---

## High Priority

### 2. saveDraftToCollection does not update the request name before persisting

**File**: `src/App.tsx` lines 59-65

The `onSave` callback in `App.tsx` calls `updateActiveRequest({ name })` then `saveDraftToCollection()`. However, `updateActiveRequest` updates `activeRequest` AND the `drafts` map, but `saveDraftToCollection` reads from `drafts[tabId]` on its very first line. Due to Zustand batching, the draft read inside `saveDraftToCollection` should see the updated draft.

**Verdict**: This works correctly because `updateActiveRequest` synchronously updates `drafts` via `set()`, and `saveDraftToCollection` reads from `get().drafts[tabId]` which reflects the latest state. No issue here after deeper analysis.

### 3. Ctrl+W closes draft tabs without confirm dialog

**File**: `src/components/request/request-panel.tsx` line 66

`Ctrl+W` calls `closeTab(activeTabId)` directly, bypassing the `handleCloseTab` logic in `request-tab-bar.tsx` that shows the confirm dialog for drafts with meaningful content.

**Impact**: User can lose unsaved draft content by pressing Ctrl+W.

**Fix**: Extract the close-with-confirm logic into a shared utility or pass `handleCloseTab` from the tab bar, or replicate the confirm check in the Ctrl+W handler:
```ts
if (e.ctrlKey && e.key === 'w') {
  e.preventDefault();
  if (activeTabId) {
    const tab = openTabs.find(t => t.id === activeTabId);
    if (tab?.isDraft) {
      const draft = useRequestStore.getState().drafts[activeTabId];
      if (draft && hasMeaningfulContent(draft)) {
        // Show save dialog or confirm
        onRequestSaveDialog?.(activeTabId);
        return;
      }
    }
    closeTab(activeTabId);
  }
}
```

### 4. Ctrl+S only triggers save dialog for drafts, does nothing for persisted dirty requests

**File**: `src/components/request/request-panel.tsx` lines 58-62

When the active tab is NOT a draft but IS dirty, Ctrl+S does nothing (auto-save handles it, but user expectation is instant save). Consider calling `saveRequest()` for non-draft dirty tabs.

**Fix**:
```ts
if (e.ctrlKey && e.key === 's') {
  e.preventDefault();
  const tab = openTabs.find(t => t.id === activeTabId);
  if (tab?.isDraft && activeTabId) {
    onRequestSaveDialog?.(activeTabId);
  } else {
    void saveRequest();
  }
}
```

---

## Medium Priority

### 5. Race condition in saveDraftToCollection tab ID replacement

**File**: `src/stores/request-store.ts` lines 195-207

After `requestService.create()` completes, the tab's `id` is changed from the draft ID to the new saved ID. But the `openTabs` array is mutated via `map` — the tab object gets a new `id`. If any other part of the app holds a reference to the old draft ID (e.g., a pending response execution), it will become stale.

**Impact**: Low likelihood but possible if user sends a request on a draft, then saves while the response is still loading. The response would be logged with the draft ID prefix, which is handled correctly by the `draft_` prefix check in response-store. Acceptable risk.

### 6. Missing error handling in saveDraftToCollection

**File**: `src/stores/request-store.ts` line 178

If `requestService.create()` throws (e.g., IndexedDB write fails), the draft data is NOT cleaned up from memory, which is correct. But the error is not caught — it propagates to `App.tsx`'s `onSave` handler, which also doesn't catch it. The `SaveRequestDialog` does have a `finally` block to reset `saving` state, but no error feedback to the user.

**Fix**: Add a try/catch in the `onSave` callback in `App.tsx` with a toast notification on failure.

### 7. `hasMeaningfulContent` check is too narrow

**File**: `src/components/request/request-tab-bar.tsx` lines 13-16

Only checks `url`, `params`, and `headers`. Does not check `body`, `auth`, `pre_script`, `post_script`, or `description`. A user who writes a request body or auth config but no URL would lose that work without a confirm prompt.

**Fix**: Extend the check:
```ts
function hasMeaningfulContent(req: ApiRequest): boolean {
  return req.url.trim() !== '' ||
    req.params.some(p => p.key.trim() !== '') ||
    req.headers.some(h => h.key.trim() !== '') ||
    (req.body.type !== 'none') ||
    (req.auth.type !== 'none') ||
    !!req.pre_script?.trim() ||
    !!req.post_script?.trim() ||
    !!req.description?.trim();
}
```

### 8. Draft tab `collection_id` set to empty string

**File**: `src/stores/request-store.ts` line 143

When creating a draft without prefill, `collection_id` is `''`. If the user sends this draft before saving, the request executes fine (collection_id isn't used for HTTP). But if any other code path checks `collection_id` validity, it could break.

**Verdict**: Acceptable for drafts since they're transient and must be saved with a real collection_id before persisting. No action needed.

---

## Low Priority

### 9. `useLiveQuery` in SaveRequestDialog triggers on every render cycle

**File**: `src/components/request/save-request-dialog.tsx` lines 35-36

The live queries for collections and folders run even when the dialog is closed. `useLiveQuery` with Dexie subscribes to table changes. Minor perf cost but worth noting.

**Fix (optional)**: Conditionally subscribe only when `open` is true, or use `useMemo` with a dependency on `open`.

### 10. Tab ordering after save

After `saveDraftToCollection`, the tab stays in its original position in the array, which is correct UX. No issue.

---

## Edge Cases Found by Scout

1. **Double Ctrl+T handler** (Critical #1 above) — discovered by scouting `app-layout.tsx` which was NOT in the changed files list but registers a competing Ctrl+T handler using `createNewRequest`.

2. **Rapid tab creation** — calling `createDraftTab()` rapidly creates multiple drafts, each with a unique UUID. No collision risk. Memory grows linearly but UUIDs ensure no overwrites. Acceptable.

3. **Closing last tab** — `closeTab` correctly handles the case where `next` array is empty, setting `activeTabId` to null. `RequestPanel` renders empty state. Works correctly.

4. **Re-opening saved request** — after saving a draft, the tab ID changes. If user navigates away and clicks the request in the sidebar, `openRequest` is called with the new persisted ID. Since the tab already has the new ID, it correctly activates the existing tab via the `existing` check in `openRequest`. Correct.

5. **App reload with drafts** — drafts are in-memory only (Zustand, no persist middleware). On page reload, all drafts are lost. This is by design and acceptable. No data loss for persisted requests.

---

## Positive Observations

- Clean separation: drafts in memory, persisted requests in IndexedDB
- `draft_` prefix convention is simple and grep-friendly for conditional logic
- Stale load prevention via `_loadingRequestId` is well-implemented
- Auto-save correctly skips drafts via both the hook check and the `saveRequest` guard
- History logging correctly skips drafts
- Save dialog UX is solid: auto-focus, Enter to confirm, prefill from context menu
- Tab close confirm only triggers for drafts with meaningful content — good UX balance

---

## Recommended Actions (Priority Order)

1. **[Critical]** Remove or fix the Ctrl+T handler in `app-layout.tsx` to prevent double tab creation
2. **[High]** Add confirm dialog for Ctrl+W on dirty drafts (matches close-button behavior)
3. **[High]** Make Ctrl+S also trigger `saveRequest()` for non-draft dirty tabs
4. **[Medium]** Extend `hasMeaningfulContent` to check body, auth, scripts, description
5. **[Medium]** Add error toast in `App.tsx` onSave callback for failed saves
6. **[Low]** Conditionally subscribe to live queries in SaveRequestDialog only when open

---

## Metrics

- **Type Coverage**: Full — all functions typed, no `any` usage
- **Test Coverage**: Not assessed (no test files for this feature in scope)
- **Linting Issues**: Unable to run (no Bash access)

## Unresolved Questions

1. Should the app prompt to save ALL open drafts on window close / app quit? Currently drafts are silently lost on reload.
2. Is `createNewRequest` in `app-layout.tsx` used by any other code path, or is it solely for the Ctrl+T shortcut? If solely Ctrl+T, safe to remove entirely.
