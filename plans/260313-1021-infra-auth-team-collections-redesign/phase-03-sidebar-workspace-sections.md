# Phase 3: Sidebar Workspace Sections

## Context

- [plan.md](./plan.md)
- [Phase 2](./phase-02-server-url-and-deployment.md)
- Depends on Phase 2 completion
- Backend workspace routes already fully implemented — this is FE-only

## Overview

- **Priority:** P2
- **Status:** Completed
- **Effort:** 4h
- **Description:** Redesign sidebar to show Personal + Team collection sections. Context-aware creation, right-click move actions.

## Key Insights

- sidebar-tabs.tsx (346 lines) manages collection tab with tree + dialogs — main modification target
- collection-tree.tsx (54 lines) renders recursive TreeNode list — needs section wrapper
- workspace-store.ts already tracks activeWorkspaceId and loads workspaces
- Backend collections already have `workspace_id` (nullable) — personal = null, team = has workspace_id
- Current UX: workspace switcher dropdown filters all collections — replace with sections

## Requirements

### Functional
- Sidebar shows "Personal" section (collections with workspace_id = null)
- Sidebar shows "Team: {name}" section(s) for each workspace user belongs to
- Each section collapsible with header
- "Create Collection" context-aware: creates in focused section
- Right-click collection → "Move to Workspace..." → workspace picker
- Right-click collection → "Move to Personal"
- Team sections only visible when logged in + member of workspace(s)

### Non-Functional
- Smooth collapse/expand animation
- No layout shift when sections appear/disappear
- Works offline (personal section always visible)

## Architecture

```
Sidebar
├── PERSONAL (always visible)
│   ├── Collection A (workspace_id = null)
│   └── Collection B
├── TEAM: "Workspace Name" (visible when logged in + member)
│   ├── Collection C (workspace_id = ws-123)
│   └── Collection D
└── + Create Collection (in active section context)
```

## Related Code Files

### Frontend — Modify
- `src/components/collections/sidebar-tabs.tsx` (346 lines) — Add section grouping logic in collections tab
- `src/components/collections/collection-tree.tsx` (54 lines) — Minor: accept section context prop
- `src/components/collections/collection-context-menu.tsx` — Add "Move to Workspace" / "Move to Personal" items
- `src/stores/collections-store.ts` — Add filter helpers: personal vs workspace collections
- `src/stores/workspace-store.ts` — Expose workspaces list for section headers
- `src/components/layout/sidebar.tsx` (92 lines) — Possibly simplify workspace switcher (sections replace it)

### Frontend — Create
- `src/components/collections/collection-section-header.tsx` (~30 lines) — Collapsible section header component
- `src/components/collections/move-to-workspace-dialog.tsx` (~50 lines) — Workspace picker dialog

## Implementation Steps

### 1. Add Collection Filter Helpers
1. In `src/stores/collections-store.ts`, add:
   ```ts
   // Filter collections by workspace
   getPersonalCollections: () => collections.filter(c => !c.workspaceId)
   getWorkspaceCollections: (wsId: string) => collections.filter(c => c.workspaceId === wsId)
   ```

### 2. Create Section Header Component
1. Create `src/components/collections/collection-section-header.tsx`:
   - Props: title, icon, isCollapsed, onToggle, onCreateCollection
   - Render: chevron + title + "+" button
   - Tailwind: text-xs uppercase tracking-wide text-zinc-500, hover states

### 3. Restructure Collections Tab in sidebar-tabs.tsx
1. In collections tab render:
   - **Personal section**: header + collection tree filtered to personal
   - **Team section(s)**: for each workspace → header + collection tree filtered to workspace
   - Team sections only render when user is logged in and has workspaces
2. Each section manages its own collapsed state
3. Search filters across all sections

### 4. Update Collection Tree
1. `collection-tree.tsx`: accept optional `sectionContext` prop (personal | workspace-id)
2. Pass context to tree items for context menu awareness

### 5. Add Context Menu Actions
1. In `collection-context-menu.tsx`, add:
   - "Move to Workspace..." → opens workspace picker dialog
   - "Move to Personal" → sets collection.workspaceId = null
   - Only show "Move to Workspace" if user has workspaces
   - Only show "Move to Personal" if collection is in a workspace

### 6. Create Move-to-Workspace Dialog
1. Create `src/components/collections/move-to-workspace-dialog.tsx`:
   - List user's workspaces (from workspace-store)
   - Click workspace → update collection's workspaceId
   - Call backend API: PATCH collection with new workspaceId
   - Update local IndexedDB

### 7. Update Create Collection Flow
1. "Create Collection" button in section header → pre-fill workspaceId based on section
2. Personal section → workspaceId = null
3. Team section → workspaceId = section's workspace ID

### 8. Simplify Workspace Switcher
1. In `sidebar.tsx`: remove or simplify workspace switcher dropdown
2. Workspace management (create, invite, leave) moves to Settings or stays as-is
3. The switcher concept is replaced by visible sections

### 9. Compile & Test
1. `pnpm type-check` + `pnpm lint`
2. Test: personal collections show in Personal section
3. Test: workspace collections show in Team section
4. Test: create collection in correct section
5. Test: move collection between personal ↔ workspace
6. Test: logged out → only Personal section visible
7. Test: offline → Personal section works normally

## Todo List

- [x] Add filter helpers to collections-store
- [x] Create collection-section-header.tsx
- [x] Restructure collections tab in sidebar-tabs.tsx
- [x] Update collection-tree.tsx with section context
- [x] Add "Move to Workspace"/"Move to Personal" to context menu
- [x] Create move-to-workspace-dialog.tsx
- [x] Update create collection flow (context-aware)
- [x] Simplify/remove workspace switcher from sidebar header
- [x] Compile check + test all flows

## Success Criteria

- Personal section always visible with correct collections
- Team sections visible when logged in with workspace membership
- Collections correctly grouped by workspace_id
- Create collection respects section context
- Move collection between personal ↔ workspace works
- Logged out: only Personal section, no errors
- Offline: Personal section fully functional

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| sidebar-tabs.tsx too large after changes | Medium | Extract section rendering into subcomponent |
| Collection tree re-render performance | Low | React.memo on tree nodes |
| Workspace data stale after move | Low | Optimistic update + sync |

## Security Considerations

- "Move to Workspace" must verify user has editor+ role in target workspace
- Backend enforces workspace membership on collection assignment
- Personal collections never exposed to workspace members

## Next Steps

- After this phase: all 3 phases complete → update docs, commit, deploy
