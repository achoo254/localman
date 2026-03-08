# Brainstorm: Draft Tab — New Request Feature

## Problem Statement
Currently `createNewRequest()` immediately persists to IndexedDB with a `collection_id`. User wants new request tabs to be **transient drafts** — only saved to a collection on explicit Ctrl+S or UI action.

## Decisions Made

| Decision | Choice |
|---|---|
| Draft storage | Memory only (Zustand) — lost on app close |
| Save trigger | Ctrl+S → dialog to pick collection/folder |
| Close unsaved draft | Confirm dialog: Save / Don't Save / Cancel (VS Code style) |
| Entry points | Ctrl+T / "+" button (blank draft) + sidebar context menu (pre-fill collection) |
| Auto-save for saved requests | Keep as-is (300ms debounce) |
| Send from draft | Allowed, response displayed but NO history saved |

## Recommended Approach: Draft Map in Zustand

### Core Concept
Add `drafts: Map<tabId, ApiRequest>` to request-store. Draft tabs live entirely in memory, never touch IndexedDB until explicit save.

### Two Tab Types

| Aspect | Draft Tab | Saved Tab |
|---|---|---|
| Storage | Zustand `drafts` map | IndexedDB via Dexie |
| Auto-save | Disabled | Enabled (300ms) |
| Ctrl+S | Opens Save-to-Collection dialog | No-op (already auto-saved) |
| Send | Yes, no history entry | Yes, saves to history |
| Close behavior | Confirm dialog if has content | Close immediately |
| Sidebar visibility | Not shown | Shown in collection tree |
| Tab visual | Italic name + dot/icon indicator | Normal |

### Implementation Changes

#### 1. `TabInfo` — Add draft flag
```typescript
interface TabInfo {
  id: string;
  name: string;
  method: ApiRequest['method'];
  isDirty: boolean;
  isDraft: boolean;  // NEW
}
```

#### 2. Request Store — Draft management
```typescript
// New state
drafts: Record<string, ApiRequest>;  // tabId → draft request data

// New actions
createDraftTab(prefillCollectionId?: string): void;
saveDraftToCollection(tabId: string, collectionId: string, folderId: string | null): Promise<void>;
getDraftRequest(tabId: string): ApiRequest | undefined;
```

- `createDraftTab()`: Generate temp ID, create blank ApiRequest in `drafts` map, open tab with `isDraft: true`
- `saveDraftToCollection()`: Take draft data → `requestService.create()` → remove from drafts → update tab to `isDraft: false`, update tab ID to real DB ID
- `setActiveTab()`: If draft → load from `drafts` map; if saved → load from DB (existing behavior)

#### 3. Auto-save Hook — Skip drafts
```typescript
// use-auto-save.ts
const isDraft = useRequestStore(s =>
  s.openTabs.find(t => t.id === s.activeTabId)?.isDraft ?? false
);
if (isDraft) return; // Skip auto-save for drafts
```

#### 4. Save-to-Collection Dialog (NEW component)
- Modal with collection tree picker + optional folder
- Triggered by Ctrl+S on draft tab
- Pre-fill collection if created from sidebar context menu
- Fields: collection selector, folder selector (optional), request name
- On confirm → `saveDraftToCollection()`

#### 5. Close Tab — Draft confirmation
```typescript
// In closeTab() or tab bar close handler
if (tab.isDraft && hasMeaningfulContent(draft)) {
  showConfirmDialog({
    title: 'Save request?',
    message: 'This request has unsaved changes.',
    actions: ['Save', "Don't Save", 'Cancel']
  });
}
```

`hasMeaningfulContent()`: Check if URL is non-empty or params/headers have values — skip dialog for truly blank drafts.

#### 6. Tab Bar UI
- "+" button at end of tab row → `createDraftTab()`
- Draft tabs: italic name, unsaved dot indicator
- Ctrl+T keyboard shortcut

#### 7. Sidebar Context Menu
- "New Request" from collection/folder context menu → `createDraftTab(collectionId)`
- Pre-fills collection in save dialog when user eventually Ctrl+S

#### 8. Keyboard Shortcuts
- `Ctrl+T`: New blank draft tab
- `Ctrl+S`: Save draft to collection (dialog) / no-op for saved requests
- `Ctrl+W`: Close tab (with draft confirmation if needed)

### Key Files to Modify

| File | Changes |
|---|---|
| `src/stores/request-store.ts` | Add drafts map, createDraftTab, saveDraftToCollection, modify setActiveTab/closeTab |
| `src/types/models.ts` | No change needed (reuse ApiRequest for drafts) |
| `src/hooks/use-auto-save.ts` | Skip when isDraft |
| `src/components/request/request-tab-bar.tsx` | Add "+" button, draft visual styling |
| `src/components/request/request-panel.tsx` | Handle Ctrl+S shortcut, integrate save dialog |
| `src/components/request/url-bar.tsx` | No change (send works same for drafts) |
| `src/services/http-client-service.ts` | Skip history save when draft (if applicable) |
| **NEW** `src/components/request/save-request-dialog.tsx` | Collection/folder picker modal |
| `src/components/collections/sidebar-tabs.tsx` | Modify "New Request" to create draft instead |

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Mất draft khi app crash | Accepted trade-off. Có thể thêm sessionStorage backup sau |
| Tab ID collision (temp vs DB) | Use prefix `draft_` for temp IDs, swap to real UUID on save |
| Race condition khi save draft | Lock save button, disable during async save |
| UX confusion draft vs saved | Clear visual indicator (italic, dot, tooltip) |

### Success Criteria
- [ ] Ctrl+T / "+" creates blank draft tab (not in DB)
- [ ] Draft edits don't trigger auto-save to DB
- [ ] Ctrl+S opens save dialog with collection/folder picker
- [ ] After save, tab becomes normal saved tab with auto-save
- [ ] Close draft tab shows confirm dialog if has content
- [ ] Send from draft works, no history entry
- [ ] Sidebar "New Request" creates draft with pre-filled collection
- [ ] Existing saved request behavior unchanged

### Out of Scope
- Draft persistence across app restarts
- Multiple draft save (save same draft to multiple collections)
- Draft sharing or sync
