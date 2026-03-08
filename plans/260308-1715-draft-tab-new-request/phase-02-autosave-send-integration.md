# Phase 02: Auto-save + Send Integration

## Priority: High | Status: complete

## Overview
Skip auto-save for draft tabs. Allow sending from drafts without saving history.

## Related Code Files
- **Modify:** `src/hooks/use-auto-save.ts`
- **Modify:** `src/stores/response-store.ts` (skip history for drafts)
- **Modify:** `src/components/request/request-panel.tsx` (handleSend for drafts)

## Implementation Steps

### 1. Skip auto-save for drafts (`use-auto-save.ts`)
```typescript
export function useAutoSave(): void {
  const saveRequest = useRequestStore(s => s.saveRequest);
  const isDirty = useRequestStore(s => s.isDirty);
  const activeTabId = useRequestStore(s => s.activeTabId);
  const openTabs = useRequestStore(s => s.openTabs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDraft = openTabs.find(t => t.id === activeTabId)?.isDraft ?? false;

  useEffect(() => {
    if (!isDirty || isDraft) return; // Skip drafts
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveRequest();
    }, DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isDirty, isDraft, saveRequest]);
}
```

### 2. Modify saveRequest — guard against drafts
In `request-store.ts`, add guard:
```typescript
async saveRequest() {
  const { activeRequest } = get();
  if (!activeRequest || !get().isDirty) return;
  // Don't save drafts to DB
  const tab = get().openTabs.find(t => t.id === activeRequest.id);
  if (tab?.isDraft) return;
  // ... existing save logic
},
```

### 3. Skip history for draft sends (`response-store.ts`)
In `executeRequest()`, check if request ID starts with `draft_`:
```typescript
// After successful response, before history entry:
const isDraft = request.id.startsWith('draft_');
if (!isDraft) {
  await historyService.addEntry({ ... });
  useHistoryStore.getState().refresh();
}
```

### 4. Modify handleSend in request-panel.tsx
Remove `await saveRequest()` call before send for drafts:
```typescript
const handleSend = async () => {
  setSendError(null);
  try {
    const tab = useRequestStore.getState().openTabs.find(
      t => t.id === useRequestStore.getState().activeTabId
    );
    // Only save for non-drafts
    if (!tab?.isDraft) await saveRequest();
    const latest = useRequestStore.getState().activeRequest;
    if (latest) executeRequest(latest);
  } catch (err) {
    setSendError(err instanceof Error ? err.message : 'Failed to send request.');
  }
};
```

## Todo
- [x] Add draft check in `useAutoSave` hook
- [x] Add draft guard in `saveRequest()`
- [x] Skip history entry for draft requests in response-store
- [x] Update `handleSend` to skip save for drafts

## Success Criteria
- Editing draft tab does NOT trigger auto-save to DB
- Sending from draft tab works, response displayed
- No history entry created for draft sends
- Saved request auto-save unchanged
