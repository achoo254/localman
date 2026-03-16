---
phase: 2
priority: high
effort: S
status: done
---

# Phase 2: Wire environment-store Mutations to Sync Queue

## Context
- `environment-store.ts` has 11 CRUD ops, none wired to sync queue
- Global variables stored in `settings` — NOT synced (local preference)
- Only `environments` table entities need sync tracking

## Related Files
- `src/stores/environment-store.ts` — target
- `src/stores/collections-store.ts` — reference pattern
- `src/services/sync/offline-change-queue.ts` — API

## Implementation Steps

1. Import `addPendingChange` in `environment-store.ts`
2. Add `queueSyncChange()` helper
3. Wire these mutations:

| Function | Action | Changes |
|----------|--------|---------|
| `createEnvironment()` | `create` | Full env data |
| `updateEnvironment()` | `update` | Changed fields |
| `deleteEnvironment()` | `delete` | `{}` |
| `addVariable()` | `update` | `{ variables }` |
| `updateVariable()` | `update` | `{ variables }` |
| `removeVariable()` | `update` | `{ variables }` |
| `setEnvironmentVariables()` | `update` | `{ variables }` |
| `applyScriptVariables()` | `update` | `{ variables }` |

4. **Skip these** (local-only, stored in `settings`):
   - `addGlobalVariable()`, `updateGlobalVariable()`, `removeGlobalVariable()`
   - `setActiveEnvironment()` — UI state, not entity data

5. Run `pnpm type-check` and `pnpm test`

## Success Criteria
- [ ] 8 environment mutations enqueue to `pending_changes`
- [ ] Global variable ops remain local-only
- [ ] Active environment selection remains local-only
- [ ] Tests pass, type-check clean
