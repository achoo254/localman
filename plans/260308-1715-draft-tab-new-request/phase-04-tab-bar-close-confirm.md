# Phase 04: Tab Bar UI + Close Confirm

## Priority: Medium | Status: complete

## Overview
Add "+" button to tab bar for creating drafts. Visual indicator for draft tabs. Confirm dialog when closing draft with content.

## Related Code Files
- **Modify:** `src/components/request/request-tab-bar.tsx`
- **Modify:** `src/stores/request-store.ts` (closeTab already exists)

## Implementation Steps

### 1. Add "+" button to tab bar
After the tab list, add a "+" button that calls `createDraftTab()`:
```tsx
<button
  type="button"
  onClick={() => createDraftTab()}
  className="shrink-0 p-2 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
  aria-label="New request"
  title="New request (Ctrl+T)"
>
  <Plus className="h-4 w-4" />
</button>
```

### 2. Draft tab visual styling
- Italic name for draft tabs
- Different dot indicator (e.g., hollow circle vs filled for dirty)

```tsx
<span className={`max-w-[120px] truncate ${tab.isDraft ? 'italic text-slate-400' : ''}`}>
  {tab.name}
</span>
```

### 3. Close confirm dialog for drafts
Use `@tauri-apps/plugin-dialog` `confirm()` (already imported in sidebar-tabs):

```typescript
const handleCloseTab = async (tabId: string) => {
  const tab = openTabs.find(t => t.id === tabId);
  if (!tab) return;

  if (tab.isDraft) {
    const draft = useRequestStore.getState().drafts[tabId];
    // Skip confirm for blank drafts
    if (draft && hasMeaningfulContent(draft)) {
      // Show 3-option dialog: need custom approach since Tauri confirm is 2-option
      // Use: confirm with "Save" button text → if yes, trigger save dialog
      //       if no → discard
      const shouldSave = await confirm(
        'This request has unsaved changes. Save before closing?',
        { title: 'Save request?', okLabel: 'Save', cancelLabel: "Don't Save" }
      );
      if (shouldSave) {
        // Trigger save dialog — emit event or set state
        onRequestSaveDialog(tabId);
        return; // Don't close yet — save dialog handles it
      }
      // else: Don't Save — fall through to close
    }
  }
  closeTab(tabId);
};
```

### 4. hasMeaningfulContent utility
```typescript
function hasMeaningfulContent(req: ApiRequest): boolean {
  return req.url.trim() !== '' ||
    req.params.some(p => p.key.trim() !== '') ||
    req.headers.some(h => h.key.trim() !== '');
}
```

### 5. Wire close handler
Replace direct `closeTab(tab.id)` in tab bar with `handleCloseTab(tab.id)`.

## Todo
- [x] Add "+" button with `createDraftTab()` call
- [x] Add italic styling for draft tab names
- [x] Import `confirm` from `@tauri-apps/plugin-dialog`
- [x] Implement close confirm for drafts with meaningful content
- [x] Add `hasMeaningfulContent()` helper
- [x] Wire save dialog trigger from close confirm

## Success Criteria
- "+" button visible at end of tab row
- Draft tabs visually distinct (italic name)
- Closing draft with content shows confirm
- Blank drafts close without confirm
- "Save" in confirm triggers save dialog
- "Don't Save" closes and discards draft
