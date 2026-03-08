# Phase 03: Save-to-Collection Dialog

## Priority: High | Status: complete

## Overview
New modal dialog for saving draft request to a collection/folder. Reuses pattern from `move-request-dialog.tsx`.

## Related Code Files
- **Create:** `src/components/request/save-request-dialog.tsx`
- **Reference:** `src/components/collections/move-request-dialog.tsx` (reuse pattern)

## Implementation Steps

### 1. Create save-request-dialog.tsx
Based on `MoveRequestDialog` pattern but with:
- Request name input field (editable, pre-filled from draft name)
- Collection dropdown (required)
- Folder dropdown (optional, filtered by selected collection)
- Pre-fill collection/folder from tab's `prefillCollectionId`/`prefillFolderId`
- Save/Cancel buttons

```typescript
interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftTabId: string | null;
  prefillCollectionId?: string;
  prefillFolderId?: string | null;
  draftName?: string;
  onSave: (tabId: string, name: string, collectionId: string, folderId: string | null) => Promise<void>;
}
```

### 2. UI Layout
```
┌─────────────────────────────┐
│ Save request                │
│                             │
│ Name: [New Request     ]    │
│                             │
│ Collection: [Select... ▾]   │
│ Folder:     [Root      ▾]   │
│                             │
│           [Cancel] [Save]   │
└─────────────────────────────┘
```

### 3. Key Behaviors
- Auto-focus name input on open
- Pre-select collection if `prefillCollectionId` provided
- Disable Save until collection selected
- On Save: call `onSave()` → close dialog
- Loading state on Save button during async

### 4. Data sources
- Collections: `db.collections.orderBy('sort_order').toArray()` via `useLiveQuery`
- Folders: `db.folders.toArray()` filtered by selected collection
- Same as MoveRequestDialog

## Todo
- [x] Create `save-request-dialog.tsx` component
- [x] Collection & folder dropdown with live query
- [x] Request name input field
- [x] Pre-fill from prefillCollectionId/folderId
- [x] Save/Cancel buttons with loading state

## Success Criteria
- Dialog opens with correct pre-filled values
- Can select collection and optional folder
- Can edit request name
- Save triggers `saveDraftToCollection()` and closes dialog
- Cancel closes without saving
