---
phase: 6
priority: high
effort: M
status: done
depends_on: [4]
---

# Phase 6: E2E Testing + Edge Cases

## Context
- Cloud sync involves many async flows and edge cases
- Need systematic testing of offline→online transitions, conflicts, auth expiry

## Test Scenarios

### Happy Path
- [ ] Login → create collection → sync → verify on backend
- [ ] Login → save request → sync → pull on fresh install
- [ ] Login → update environment → sync → verify version incremented
- [ ] Login → delete entity → sync → verify soft-deleted on backend

### Offline→Online
- [ ] Go offline → make changes → go online → auto-sync fires
- [ ] Rapid online/offline toggles → no duplicate syncs (debounce works)
- [ ] Queue 50+ changes offline → sync all at once

### Conflict Resolution
- [ ] Edit same entity on 2 clients → push → detect conflict
- [ ] Non-overlapping field edits → auto-merge succeeds
- [ ] Overlapping field edits → conflict returned to UI

### Auth Edge Cases
- [ ] Token expires during sync → refresh token → retry
- [ ] Logout during active sync → sync cancelled, queue cleared
- [ ] Login with different account → queue cleared, fresh pull

### Error Handling
- [ ] Backend down → sync fails gracefully, queue preserved
- [ ] Network timeout → appropriate error message
- [ ] Invalid response → error logged, no data corruption

## Implementation
- Unit tests for `queueSyncChange()` in request-store and environment-store
- Integration tests for `syncAll()` with mock backend
- Manual E2E test checklist for Tauri app

## Success Criteria
- [ ] All unit tests pass
- [ ] Integration tests cover pull/push/conflict flows
- [ ] Manual E2E checklist completed on Windows
- [ ] No data loss in any scenario
