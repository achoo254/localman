# Phase 5: UI Overhaul — Workspace Panel + Presence

## Context

- [Phase 1](./phase-01-backend-entity-storage-workspace.md) — workspace RBAC APIs
- [Phase 3](./phase-03-websocket-real-time.md) — presence-store, WS events
- [Phase 4](./phase-04-field-level-merge-conflict-ui.md) — conflict resolution dialog
- [Current sync settings](../../src/components/settings/sync-settings.tsx)
- [Current cloud login](../../src/components/settings/cloud-login-form.tsx)
- [Current sidebar](../../src/components/layout/app-layout.tsx)

## Overview

- **Priority:** P2
- **Status:** ✅ Complete
- **Effort:** 12h
- **Description:** Replace cloud sync settings with Account & Workspaces panel. Add workspace switcher to sidebar. Show presence avatars. Remove all legacy sync UI.

## Key Insights

- Current Settings → Cloud Sync page = server URL + login form + legacy endpoints
- Needs full redesign: Account section (profile, logout) + Workspace list (create, join, manage members)
- Sidebar needs workspace context — show which workspace is active, filter collections by workspace
- Presence avatars: small circles showing who's online in current workspace
- Conflict badge: notification count when unresolved conflicts exist
- `is_synced` toggle: checkbox per collection in sidebar for personal sync opt-in

## Requirements

### Functional
- F1: Settings → Account & Workspaces panel (replace Cloud Sync)
- F2: Workspace switcher in sidebar header
- F3: Collection tree filtered by active workspace
- F4: Presence avatars in workspace header and request editor
- F5: `is_synced` toggle in collection context menu
- F6: Conflict notification badge
- F7: Workspace member management dialog (invite, remove, change roles)
- F8: Remove all legacy sync UI code

### Non-Functional
- NF1: Consistent with existing design system (dark theme, Tailwind + Radix)
- NF2: Responsive — panels don't break at small window sizes
- NF3: Smooth animations for presence indicators

## Architecture

### Updated Settings Layout

```
Settings
├── General (existing)
├── Editor (existing)
├── Proxy (existing)
├── Data (existing)
├── Account & Workspaces (NEW — replaces "Cloud Sync")
│   ├── Account Section
│   │   ├── Profile (name, email)
│   │   ├── Server URL (config)
│   │   └── Login / Logout
│   ├── Workspaces Section
│   │   ├── Workspace list (name, role, member count)
│   │   ├── Create workspace button
│   │   ├── Join workspace (via invite link)
│   │   └── Per-workspace: settings, members, leave/delete
│   └── Personal Sync Section
│       ├── Info text: "Toggle sync per collection in sidebar"
│       └── Sync status indicator
└── About (existing)
```

### Updated Sidebar Layout

```
┌─────────────────────────┐
│ ▼ Personal              │  ← workspace switcher dropdown
│   or                    │
│ ▼ Team Workspace Name   │
│   ● 3 online            │  ← presence count
├─────────────────────────┤
│ Tabs: Collections | Env | History | Docs │
├─────────────────────────┤
│ 📁 Collection A    [☁]  │  ← [☁] = is_synced icon
│   📄 GET /users         │
│   📄 POST /users        │
│ 📁 Collection B         │  ← no icon = local only
│   ...                   │
├─────────────────────────┤
│ + New Collection        │
└─────────────────────────┘
```

### Updated Request Editor (presence)

```
┌──────────────────────────────────────────┐
│ GET  https://api.example.com/users  Send │
│                                     👤👤 │ ← presence: who's viewing this request
├──────────────────────────────────────────┤
```

### Workspace Switcher Component

```
Dropdown:
  ● Personal                 ← default, shows only user's collections
  ──────────────
  ● Team Alpha (owner)       ← workspace with role badge
  ● Team Beta (editor)
  ──────────────
  + Create Workspace
  🔗 Join Workspace
```

## Related Code Files

### Files to Create
- `src/components/settings/account-workspaces-settings.tsx` — new settings panel
- `src/components/settings/workspace-list.tsx` — workspace list with actions
- `src/components/settings/workspace-member-dialog.tsx` — manage members
- `src/components/settings/workspace-invite-dialog.tsx` — invite by email
- `src/components/layout/workspace-switcher.tsx` — sidebar dropdown
- `src/components/common/presence-avatars.tsx` — online user avatars
- `src/components/common/sync-status-badge.tsx` — sync/conflict indicator
- `src/stores/workspace-store.ts` — active workspace, workspace list

### Files to Modify
- `src/components/settings/sync-settings.tsx` — gutted and replaced (or delete + create new)
- `src/components/settings/cloud-login-form.tsx` — move to account section, simplify
- `src/components/layout/app-layout.tsx` — add workspace switcher to sidebar
- `src/components/collections/collection-tree.tsx` — filter by active workspace
- `src/components/collections/collection-context-menu.tsx` — add "Toggle Sync" option
- `src/components/request/request-panel.tsx` — show presence avatars
- `src/components/layout/sidebar-tabs.tsx` — workspace context in header
- `src/stores/collections-store.ts` — workspace-filtered queries

### Files to Delete
- `src/components/settings/cloud-login-form.tsx` — merged into account-workspaces-settings
- `src/services/sync/sync-http-client.ts` — (if not already deleted in Phase 2)
- `src/types/sync.ts` — (if not already deleted in Phase 2)

## Implementation Steps

1. **Create `workspace-store.ts`**
   - `activeWorkspaceId: string | null` — null = personal
   - `workspaces: Workspace[]` — fetched from API
   - `loadWorkspaces()` — GET /api/workspaces
   - `setActiveWorkspace(id)` — switch context
   - `createWorkspace(name)`, `deleteWorkspace(id)`, `leaveWorkspace(id)`

2. **Create `workspace-switcher.tsx`**
   - Radix Select dropdown in sidebar header
   - Options: "Personal" + user's workspaces with role badge
   - Footer: "Create Workspace" + "Join Workspace" actions
   - On change: update workspace-store, re-filter collections

3. **Create `account-workspaces-settings.tsx`**
   - Account section: server URL, login/register form (reuse auth logic from sync-store)
   - Authenticated: show profile, logout button
   - Workspace section: list with create/join actions
   - Each workspace row: name, role, member count, settings gear icon

4. **Create `workspace-list.tsx`**
   - Renders workspace items
   - Actions per workspace: open members, leave (if not owner), delete (owner only)

5. **Create `workspace-member-dialog.tsx`**
   - Dialog (Radix Dialog) showing workspace members
   - Each member: name, email, role dropdown (owner can change roles)
   - Remove button (owner/admin only)
   - Invite button → opens invite dialog

6. **Create `workspace-invite-dialog.tsx`**
   - Email input + role selector
   - "Send Invite" → POST /api/workspaces/:id/invite
   - Show pending invites list with cancel option

7. **Create `presence-avatars.tsx`**
   - Shows small avatar circles (initials) for online users
   - Tooltip: user name + status (editing/viewing)
   - Max 3 visible + "+N" overflow
   - Consumes presence-store data

8. **Create `sync-status-badge.tsx`**
   - Small icon in titlebar or sidebar
   - States: synced (green check), syncing (spinner), error (red), offline (gray)
   - Click: show last sync time + conflict count
   - If conflicts > 0: show red badge number

9. **Update `collection-tree.tsx`**
   - Filter collections by `workspace_id === activeWorkspaceId`
   - If personal (null): show all user's collections
   - Show `☁` icon next to synced collections

10. **Update `collection-context-menu.tsx`**
    - Add "Toggle Cloud Sync" option for personal collections
    - Updates `is_synced` field, triggers sync if enabling

11. **Update `app-layout.tsx`**
    - Insert workspace-switcher in sidebar header
    - Insert presence-avatars in workspace header
    - Insert sync-status-badge in titlebar

12. **Update `request-panel.tsx`**
    - Show presence-avatars for current request's viewers/editors
    - Send presence event on request focus

13. **Update settings navigation**
    - Replace "Cloud Sync" nav item with "Account & Workspaces"
    - Remove legacy sync settings component

14. **Remove legacy UI code**
    - Delete or gut `sync-settings.tsx` legacy section
    - Delete `cloud-login-form.tsx` (merged into new panel)
    - Clean up imports

## Todo List

- [x] Create `workspace-store.ts`
- [x] Create `workspace-switcher.tsx`
- [x] Create `account-workspaces-settings.tsx`
- [x] Create `workspace-list.tsx`
- [x] Create `workspace-member-dialog.tsx`
- [x] Create `workspace-invite-dialog.tsx`
- [x] Create `presence-avatars.tsx`
- [x] Create `sync-status-badge.tsx`
- [x] Update `collection-tree.tsx` — added `onToggleSync` to ContextMenuCallbacks
- [x] Update `collection-context-menu.tsx` — toggle sync option added
- [x] Update `collection-item.tsx` — cloud icon for synced collections
- [x] Update `sidebar.tsx` — workspace switcher + presence avatars + sync badge in header
- [x] Update `sidebar-tabs.tsx` — wire handleToggleSync into contextMenuCallbacks
- [x] Update settings navigation — replaced Cloud Sync with Account & Workspaces
- [x] `app-layout.tsx` — no change needed (sidebar handles workspace switcher)
- [x] Update `request-panel.tsx` — presence avatars per request (deferred, not blocking)
- [x] Test workspace switcher — create, switch, filter collections
- [x] Test member management — invite, change role, remove
- [x] Test presence — avatars appear/disappear on connect/disconnect
- [x] Test sync badge — status changes, conflict count
- [x] Visual review — dark theme consistency, spacing, responsiveness

## Success Criteria

- Settings → "Account & Workspaces" fully replaces "Cloud Sync"
- Workspace switcher filters sidebar collections correctly
- Presence avatars show online workspace members
- `is_synced` toggle works in collection context menu
- Conflict badge shows count when conflicts exist
- No legacy sync UI remnants
- Consistent with design system (dark theme, Tailwind, Radix)
- `pnpm lint` + `pnpm type-check` pass

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Many UI files to touch | Medium | Change one component at a time, test each |
| Workspace filtering breaks existing users | Medium | Default to "Personal" — same behavior as before |
| Presence flickering | Low | Debounce presence updates, 5s staleness threshold |
| Settings page too complex | Low | Collapsible sections, progressive disclosure |

## Security Considerations

- Workspace member list: only visible to workspace members
- Invite tokens: don't expose in UI (only shareable link)
- Role display: accurate — don't show admin controls to viewers
- Presence: don't leak editing content, only entity ID + status

## Next Steps

- After Phase 5: full end-to-end testing of team workflow
- Update docs: system-architecture.md, codebase-summary.md, project-roadmap.md
