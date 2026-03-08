# Phase 05: Keyboard Shortcuts + Sidebar Integration

## Priority: Medium | Status: complete

## Overview
Wire Ctrl+T (new draft), Ctrl+S (save draft), Ctrl+W (close tab). Modify sidebar "New Request" to create draft instead of DB record.

## Related Code Files
- **Modify:** `src/components/request/request-panel.tsx`
- **Modify:** `src/components/collections/sidebar-tabs.tsx`

## Implementation Steps

### 1. Global keyboard shortcuts (request-panel.tsx)
Add `useEffect` for keyboard shortcuts:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+T: New draft tab
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      createDraftTab();
    }
    // Ctrl+S: Save draft to collection
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      const tab = openTabs.find(t => t.id === activeTabId);
      if (tab?.isDraft) {
        setSaveDialogOpen(true); // Open save dialog
      }
      // For saved requests: no-op (auto-save handles it)
    }
    // Ctrl+W: Close active tab
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) handleCloseTab(activeTabId);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [activeTabId, openTabs]);
```

### 2. Integrate SaveRequestDialog in request-panel.tsx
```typescript
const [saveDialogOpen, setSaveDialogOpen] = useState(false);
const activeTab = openTabs.find(t => t.id === activeTabId);

// In JSX:
<SaveRequestDialog
  open={saveDialogOpen}
  onOpenChange={setSaveDialogOpen}
  draftTabId={activeTabId}
  prefillCollectionId={activeTab?.prefillCollectionId}
  prefillFolderId={activeTab?.prefillFolderId}
  draftName={activeRequest?.name}
  onSave={async (tabId, name, collectionId, folderId) => {
    // Update name if changed
    if (name !== activeRequest?.name) {
      updateActiveRequest({ name });
    }
    await saveDraftToCollection(tabId, collectionId, folderId);
  }}
/>
```

### 3. Update "New Request" button in empty state
Change `handleNewRequest` in request-panel.tsx:
```typescript
async function handleNewRequest() {
  createDraftTab(); // Instead of DB create
}
```

### 4. Modify sidebar "New Request" context menu
In `sidebar-tabs.tsx`, change `handleNewRequest`:
```typescript
const handleNewRequest = (collectionId: string, folderId: string | null) => {
  createDraftTab(collectionId, folderId); // Pre-fill collection
};
```
Remove `createNewRequest` store import, use `createDraftTab` instead.

### 5. Prevent Tauri default Ctrl+W
May need to check if Tauri intercepts Ctrl+W (window close). If so, handle via Tauri config or `preventDefault` in Rust.

## Todo
- [x] Add Ctrl+T handler → `createDraftTab()`
- [x] Add Ctrl+S handler → open save dialog for drafts
- [x] Add Ctrl+W handler → close active tab (with confirm)
- [x] Integrate `SaveRequestDialog` in request-panel
- [x] Update empty state "New Request" button to create draft
- [x] Modify sidebar `handleNewRequest` to create draft with pre-fill
- [x] Test Ctrl+W doesn't conflict with Tauri window close

## Success Criteria
- Ctrl+T creates new blank draft tab
- Ctrl+S on draft opens save dialog; on saved tab does nothing
- Ctrl+W closes active tab with draft confirm if needed
- Sidebar "New Request" creates draft pre-filled with that collection
- Empty state button creates blank draft
