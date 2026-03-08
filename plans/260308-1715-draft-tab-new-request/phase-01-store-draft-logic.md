# Phase 01: Store & Draft Logic

## Priority: High | Status: complete

## Overview
Add draft tab support to request-store. Drafts live in Zustand memory, never written to IndexedDB until explicit save.

## Key Insights
- Current `TabInfo` has no draft concept — all tabs reference DB records
- `createNewRequest()` immediately calls `requestService.create()` → DB write
- `loadRequest()` fetches from DB — needs fallback for drafts
- `openRequest()` expects full `ApiRequest` — drafts reuse same shape

## Related Code Files
- **Modify:** `src/stores/request-store.ts`
- **Reference:** `src/types/models.ts` (ApiRequest type)
- **Reference:** `src/db/utils.ts` (newId, now)

## Implementation Steps

### 1. Extend TabInfo
```typescript
export interface TabInfo {
  id: string;
  name: string;
  method: ApiRequest['method'];
  isDirty: boolean;
  isDraft: boolean; // NEW — true for unsaved draft tabs
  prefillCollectionId?: string; // NEW — pre-fill when saving (from sidebar)
  prefillFolderId?: string | null; // NEW — pre-fill folder
}
```

### 2. Add draft state & actions to RequestStore
```typescript
interface RequestStore {
  // ... existing
  drafts: Record<string, ApiRequest>; // tabId → in-memory draft data

  createDraftTab(prefillCollectionId?: string, prefillFolderId?: string | null): void;
  saveDraftToCollection(tabId: string, collectionId: string, folderId: string | null): Promise<void>;
  updateDraft(tabId: string, partial: Partial<ApiRequest>): void;
}
```

### 3. Implement createDraftTab
- Generate temp ID with `draft_` prefix: `draft_${crypto.randomUUID()}`
- Create blank `ApiRequest` object (same shape, empty fields)
- Add to `drafts` map
- Open tab with `isDraft: true`
- Set as active, load into `activeRequest`

```typescript
createDraftTab(prefillCollectionId?: string, prefillFolderId?: string | null) {
  const id = `draft_${crypto.randomUUID()}`;
  const ts = new Date().toISOString();
  const draft: ApiRequest = {
    id,
    collection_id: prefillCollectionId ?? '',
    folder_id: prefillFolderId ?? null,
    name: 'New Request',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
    sort_order: 0,
    created_at: ts,
    updated_at: ts,
  };
  const tab: TabInfo = {
    id,
    name: 'New Request',
    method: 'GET',
    isDirty: false,
    isDraft: true,
    prefillCollectionId,
    prefillFolderId,
  };
  set({
    drafts: { ...get().drafts, [id]: draft },
    openTabs: [...get().openTabs, tab],
    activeTabId: id,
    activeRequest: draft,
    isDirty: false,
  });
},
```

### 4. Modify loadRequest — handle drafts
```typescript
async loadRequest(id: string | null) {
  if (!id) { set({ activeRequest: null, _loadingRequestId: null }); return; }
  // Check drafts first
  const draft = get().drafts[id];
  if (draft) {
    set({ activeRequest: draft, _loadingRequestId: null });
    return;
  }
  // Existing DB load
  set({ _loadingRequestId: id });
  const req = await requestService.getById(id);
  if (get()._loadingRequestId !== id) return;
  if (req) set({ activeRequest: req });
},
```

### 5. Modify updateActiveRequest — update drafts map
```typescript
updateActiveRequest(partial: Partial<ApiRequest>) {
  const { activeRequest } = get();
  if (!activeRequest) return;
  const updated = { ...activeRequest, ...partial };
  const tab = get().openTabs.find(t => t.id === activeRequest.id);
  const isDraft = tab?.isDraft ?? false;

  set({ activeRequest: updated, isDirty: true });

  // Update drafts map if draft
  if (isDraft) {
    set({ drafts: { ...get().drafts, [activeRequest.id]: updated } });
  }

  // Update tab info
  const tabs = get().openTabs.map(t =>
    t.id === activeRequest.id
      ? { ...t, name: updated.name ?? t.name, method: updated.method, isDirty: true }
      : t
  );
  set({ openTabs: tabs });
},
```

### 6. Implement saveDraftToCollection
```typescript
async saveDraftToCollection(tabId: string, collectionId: string, folderId: string | null) {
  const draft = get().drafts[tabId];
  if (!draft) return;

  // Persist to DB
  const saved = await requestService.create({
    collection_id: collectionId,
    folder_id: folderId,
    name: draft.name,
    method: draft.method,
    url: draft.url,
    params: draft.params,
    headers: draft.headers,
    body: draft.body,
    auth: draft.auth,
    description: draft.description,
    pre_script: draft.pre_script,
    post_script: draft.post_script,
    sort_order: draft.sort_order,
  });

  // Remove from drafts
  const { [tabId]: _, ...remainingDrafts } = get().drafts;

  // Update tab: swap ID, clear draft flag
  const tabs = get().openTabs.map(t =>
    t.id === tabId
      ? { ...t, id: saved.id, isDraft: false, isDirty: false, prefillCollectionId: undefined, prefillFolderId: undefined }
      : t
  );

  set({
    drafts: remainingDrafts,
    openTabs: tabs,
    activeTabId: get().activeTabId === tabId ? saved.id : get().activeTabId,
    activeRequest: get().activeTabId === tabId ? saved : get().activeRequest,
    isDirty: false,
  });
},
```

### 7. Modify closeTab — remove draft from map
In `closeTab()`, after removing tab, also clean up drafts:
```typescript
// After existing close logic
const { [id]: _, ...remainingDrafts } = get().drafts;
if (get().drafts[id]) {
  set({ drafts: remainingDrafts });
}
```

## Todo
- [x] Add `isDraft`, `prefillCollectionId`, `prefillFolderId` to TabInfo
- [x] Add `drafts` state to RequestStore
- [x] Implement `createDraftTab()`
- [x] Implement `saveDraftToCollection()`
- [x] Modify `loadRequest()` to check drafts first
- [x] Modify `updateActiveRequest()` to sync drafts map
- [x] Modify `closeTab()` to clean up drafts
- [x] Add `isDraft: false` to existing `openRequest()` tab creation

## Success Criteria
- `createDraftTab()` creates in-memory request, no DB write
- Switching tabs loads draft from memory (not DB)
- `saveDraftToCollection()` persists to DB, converts tab to saved
- Existing saved request flow unchanged
