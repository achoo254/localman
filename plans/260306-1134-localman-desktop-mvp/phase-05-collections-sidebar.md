# Phase 05 — Collections & Sidebar

## Context
- [requirement.md Section 4.3](../../requirement.md) — Collections & Organization
- Depends on: Phase 01, Phase 02

## Overview
- **Priority:** P1
- **Status:** pending
- **Estimate:** 5 days
- **Description:** Collections CRUD with nested folders, sidebar tree view, drag-and-drop reorder, search, and bulk operations.

## Key Insights
- Tree structure: Collection -> Folders (nested) -> Requests
- Drag-and-drop: use `@dnd-kit/core` (lightweight, accessible) or `react-dnd`
- Sidebar width resizable (240px default, 180-400px range)
- Collections sidebar is the primary navigation — must feel fast
- Dexie liveQuery keeps sidebar in sync with DB automatically

## Requirements

### Functional
- Create/rename/delete collections
- Create/rename/delete folders (nested within collections, unlimited depth)
- Create/duplicate/move/delete requests
- Drag-and-drop: reorder requests, move between folders/collections
- Search across all requests (name, URL)
- Right-click context menu (Radix Context Menu)
- Sidebar tabs: Collections, History (Phase 07), Environments (Phase 06)
- Collapse/expand folders
- Request count per collection badge

### Non-Functional
- Sidebar renders 500+ items without lag
- Drag-and-drop feedback < 16ms (60fps)
- Search results appear as user types (debounced 150ms)

## Architecture

### Component Tree
```
<Sidebar>
  <SidebarTabs>
    <CollectionsTab>
      <CollectionSearch />
      <CollectionTree>
        <CollectionItem>
          <FolderItem>
            <RequestItem />
          </FolderItem>
          <RequestItem />
        </CollectionItem>
      </CollectionTree>
      <NewCollectionButton />
    </CollectionsTab>
    <HistoryTab />      // Phase 07
    <EnvironmentsTab /> // Phase 06
  </SidebarTabs>
</Sidebar>
```

### Zustand Store — `collections-store.ts`
```typescript
interface CollectionsStore {
  collections: Collection[];
  folders: Folder[];
  requests: ApiRequest[];
  searchQuery: string;
  expandedIds: Set<string>;  // collapsed/expanded state

  // Actions
  createCollection: (name: string) => Promise<void>;
  createFolder: (collectionId: string, parentId: string | null, name: string) => Promise<void>;
  moveItem: (itemId: string, targetId: string, position: 'before' | 'after' | 'inside') => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  toggleExpand: (id: string) => void;
  setSearch: (query: string) => void;
}
```

### Tree Data Structure
Build virtual tree from flat DB tables:
```typescript
interface TreeNode {
  id: string;
  type: 'collection' | 'folder' | 'request';
  name: string;
  method?: HttpMethod;  // for requests
  children: TreeNode[];
  sortOrder: number;
}

function buildTree(collections, folders, requests): TreeNode[]
```

## Related Code Files

### Create
- `src/components/layout/sidebar.tsx` — Update with real sidebar
- `src/components/collections/collection-tree.tsx` — Tree view container
- `src/components/collections/collection-item.tsx` — Collection node
- `src/components/collections/folder-item.tsx` — Folder node
- `src/components/collections/request-item.tsx` — Request node
- `src/components/collections/collection-search.tsx` — Search input
- `src/components/collections/collection-context-menu.tsx` — Right-click menu
- `src/components/collections/create-collection-dialog.tsx` — Create/rename dialog
- `src/components/collections/create-folder-dialog.tsx` — Create/rename folder
- `src/components/collections/sidebar-tabs.tsx` — Collections/History/Envs tabs
- `src/stores/collections-store.ts` — Zustand store
- `src/utils/tree-builder.ts` — Build tree from flat data
- `src/hooks/use-collection-tree.ts` — Hook combining liveQuery + tree builder

## Implementation Steps

1. **Create collections Zustand store**
   - CRUD actions wrapping DB services
   - Expanded/collapsed state (persisted to settings)
   - Search filter

2. **Create tree builder utility**
   - Input: flat arrays (collections, folders, requests)
   - Output: nested TreeNode array
   - Sort by `sort_order` at each level
   - Filter by search query (show matching + ancestors)

3. **Build collection tree component**
   - Recursive rendering of TreeNode
   - Indent levels (16px per level)
   - Expand/collapse chevron icons
   - Method color dot for requests

4. **Build collection/folder/request items**
   - CollectionItem: icon, name, request count, expand toggle
   - FolderItem: folder icon, name, expand toggle
   - RequestItem: method badge (colored), name, click to open

5. **Build context menus**
   - Collection: New Request, New Folder, Rename, Duplicate, Delete
   - Folder: New Request, New Sub-folder, Rename, Move, Delete
   - Request: Duplicate, Move, Copy as cURL, Delete

6. **Build create/rename dialogs**
   - Radix Dialog with name input
   - Validation (non-empty, unique within parent)

7. **Implement drag-and-drop**
   - Install `@dnd-kit/core` + `@dnd-kit/sortable`
   - DnD within same collection (reorder)
   - DnD between folders/collections (move)
   - Visual drop indicators (line above/below, highlight target folder)

8. **Build search**
   - Debounced search input (150ms)
   - Filter tree: show matching requests + their ancestor folders/collections
   - Highlight matching text

9. **Build sidebar tabs**
   - Tab icons: Collections (folder), History (clock), Environments (layers)
   - Vertical icon bar on left edge

10. **Integrate with request panel**
    - Click request item -> open in request panel (new tab or switch)
    - Active request highlighted in sidebar

## Todo List
- [ ] Create collections Zustand store
- [ ] Create tree builder utility
- [ ] Build recursive collection tree component
- [ ] Build collection/folder/request item components
- [ ] Build context menus (Radix)
- [ ] Build create/rename dialogs
- [ ] Implement drag-and-drop (dnd-kit)
- [ ] Build search with filtering
- [ ] Build sidebar tabs (Collections/History/Envs)
- [ ] Integrate sidebar with request panel
- [ ] Handle bulk delete with confirmation

## Success Criteria
- Create, rename, delete collections/folders/requests works
- Drag-and-drop reorders and moves items
- Search filters tree in real-time
- Context menu shows correct actions per item type
- Clicking request opens it in request panel
- 500+ items render without lag

## Risk Assessment
- Deep nesting (10+ levels) — cap visual indentation at 6 levels, allow unlimited in data
- Drag-and-drop with virtualized list is complex — skip virtualization for MVP, add if perf issue
- Race conditions on rapid drag operations — debounce sort_order updates

## Next Steps
- Phase 06: Environments & Variables
