---
phase: 1
priority: high
effort: S
status: done
---

# Phase 1: Wire request-store Mutations to Sync Queue

## Context
- `collections-store.ts` already has `queueSyncChange()` helper pattern — reuse it
- `request-store.ts` has 3 mutation paths that write to DB without sync tracking

## Related Files
- `src/stores/request-store.ts` — target
- `src/stores/collections-store.ts` — reference pattern (lines 48-62)
- `src/services/sync/offline-change-queue.ts` — `addPendingChange()` API

## Implementation Steps

1. Import `addPendingChange` in `request-store.ts`
2. Add same `queueSyncChange()` helper (copy from collections-store)
3. Wire these mutations:

| Function | Action | Changes to track |
|----------|--------|-----------------|
| `createNewRequest()` | `create` | Full request data |
| `saveRequest()` | `update` | Changed fields delta |
| `saveDraftToCollection()` | `create` | Full request data |

4. **Skip draft auto-save** — drafts are local-only, no sync needed
5. Run `pnpm type-check` and `pnpm test`

## Success Criteria
- [ ] All 3 mutations enqueue to `pending_changes` table
- [ ] Draft saves remain local-only (no sync queue)
- [ ] Existing tests pass
- [ ] Type-check clean
