---
phase: 5
priority: medium
effort: S
status: done
depends_on: []
---

# Phase 5: Design — Account Settings Logged-In State

## Context
- Current design (`HoGUk`) only shows logged-out state
- Need logged-in state showing: user info, sync status, sync controls, workspace list
- Use Pencil MCP tool to update `localman-design-system.pen`

## Design Requirements

### Logged-In Account Screen
Copy existing `Screen / Settings — Account` (`HoGUk`) and modify `aMain` section:

**Section 1: ACCOUNT (logged in)**
- User avatar (circle) + name + email
- "Sign Out" button (destructive)
- Sync status: last sync time + sync now button

**Section 2: SYNC SETTINGS**
- Toggle: Auto-sync on reconnect (default: on)
- Toggle: Periodic sync every 5 min (default: on)
- Pending changes count badge

**Section 3: WORKSPACES**
- List of workspaces with role badges
- "Create Workspace" button

### Sync Status Indicator States
Verify existing `sync-status-indicator` covers all states:
- Idle (cloud icon)
- Syncing (spinner)
- Error (cloud-alert)
- Offline (cloud-off)

## Implementation
- Use Pencil `batch_design` to create new screen variant
- Place next to existing Account screen
- Reuse existing components (Badge, Toggle, Button)

## Success Criteria
- [ ] Logged-in Account screen designed in .pen file
- [ ] All sync indicator states visible
- [ ] Screenshot verified via `get_screenshot`
