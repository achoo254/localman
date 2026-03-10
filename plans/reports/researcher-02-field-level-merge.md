# Field-Level Merge & Optimistic Locking for Team Collaboration

**Date:** 2026-03-10
**Context:** Localman API client — multi-user editing of structured request objects (method, url, headers_json, body_json, auth_json, pre_script, post_script) with offline-first sync.

---

## Executive Summary

**Recommended Approach:** Hybrid 3-way merge with optimistic locking on server + field-level dirty tracking on client + conflict UI for pick-one-field resolution.

- **Server:** PostgreSQL optimistic locking via version counter + 3-way merge algorithm
- **Client:** IndexedDB dirty tracking (which fields changed) + local merge replay
- **Conflicts:** Show per-field diffs, let user accept/reject/choose version
- **Offline:** Queue changes with dirty flags, replay on reconnect with merge logic

---

## 1. Optimistic Locking Pattern (PostgreSQL)

### Version Counter Approach
Add `version INT` column to requests table. All updates check & increment version:

```sql
-- Read (client captures version)
SELECT id, method, url, headers_json, body_json, version
FROM requests
WHERE id = ?;

-- Update with optimistic check
UPDATE requests
SET method = ?, url = ?, headers_json = ?, body_json = ?,
    version = version + 1,
    updated_at = NOW()
WHERE id = ? AND version = ?
RETURNING id, version, method, url, headers_json, body_json;

-- If RETURNING is empty → conflict (version mismatch)
-- Client must refetch & retry with 3-way merge
```

### Pessimistic Alternative (Lock-to-Update)
For high-contention scenarios, use `SELECT FOR UPDATE`:

```sql
BEGIN;
SELECT * FROM requests WHERE id = ? FOR UPDATE;
-- ... compute changes ...
UPDATE requests SET ... WHERE id = ? AND version = ?;
COMMIT;
```

**Recommendation:** Start with optimistic (no locks, better concurrency) + 3-way merge. Switch to pessimistic only if contention is severe.

### Handling Conflicts
Client-side retry logic on version mismatch:

```
1. Client reads request at version V1
2. Client submits update with version=V1
3. Server returns error (current version is V2)
4. Client fetches latest (V2)
5. Apply 3-way merge: (old=V0, local=client changes, remote=V2)
6. Retry update with merged result at version=V2
```

**Key insight:** Don't fail the user. Merge & retry automatically when possible.

---

## 2. Field-Level Merge Algorithm

### 3-Way Merge (Structured Data)
Compare three versions: base (common ancestor), local (client), remote (server):

```
Algorithm: 3WayMerge(base, local, remote)
  merged = {}

  for each field in union(base.keys, local.keys, remote.keys):
    baseVal = base[field] // reference version from last sync
    localVal = local[field] // user's changes
    remoteVal = remote[field] // server's version

    if localVal == remoteVal:
      // Both agree or one didn't change
      merged[field] = remoteVal

    else if localVal == baseVal:
      // Client didn't change, server did
      merged[field] = remoteVal

    else if remoteVal == baseVal:
      // Server didn't change, client did
      merged[field] = localVal

    else:
      // Both changed differently → CONFLICT
      // Store conflict, return to UI
      merged[field] = {
        status: "CONFLICT",
        base: baseVal,
        local: localVal,
        remote: remoteVal,
        resolution: null // User picks one
      }

  return merged
```

### Auto-Merge Rules
- **Non-overlapping fields:** Auto-merge (no conflict)
- **Same field, same value:** Auto-merge (converge)
- **Same field, different values:** Conflict — require user decision
- **Array/JSON fields:** Treat as atomic (no deep merging for nested objects)

### Example: Request Object
```json
// Base (last sync)
{ "method": "GET", "url": "http://api.example.com", "auth_json": {} }

// Local (client changes)
{ "method": "GET", "url": "http://api.v2.example.com", "auth_json": {} }

// Remote (server has)
{ "method": "POST", "url": "http://api.example.com", "auth_json": {"type": "bearer"} }

// Merged Result
{
  "method": "POST", // conflict → user picks
  "url": "http://api.v2.example.com", // client changed, server didn't
  "auth_json": {"type": "bearer"} // server changed, client didn't
}
```

---

## 3. Client-Side Dirty Tracking

### Change Tracking Structure
Store original + current state, compute diff:

```typescript
interface RequestSnapshot {
  version: number; // server version at last sync
  data: RequestData; // current state
  baseline: RequestData; // state at last sync
  dirtyFields: Set<string>; // which fields user changed
}

function computeDirty(baseline, current): Set<string> {
  const dirty = new Set<string>();
  for (const field of Object.keys(current)) {
    if (JSON.stringify(baseline[field]) !== JSON.stringify(current[field])) {
      dirty.add(field);
    }
  }
  return dirty;
}
```

### Offline Sync Queue (IndexedDB)
Track each pending change:

```typescript
interface SyncQueueItem {
  id: string; // request ID
  version: number; // version when queued
  timestamp: number; // when user made change
  dirtyFields: string[]; // ["url", "headers_json"]
  changes: {
    [fieldName]: any; // new values for dirty fields only
  };
  status: "pending" | "failed" | "merged";
}

// When user edits → add to queue
db.syncQueue.add({
  id: requestId,
  version: currentVersion,
  dirtyFields: ["url"],
  changes: { url: "new value" },
  status: "pending"
});
```

### Local Merge Before Upload
When offline user edits, check if another user also changed those fields:

```
OnUserChange(fieldName, newValue):
  1. Get dirty fields from queue for this request
  2. If fieldName in existingDirty:
     - Apply 3-way merge logic locally
     - Show toast: "Field edited offline; merged with server version"
  3. Add to queue with updated dirtyFields
```

---

## 4. Conflict Resolution UI Pattern

### Recommended: Per-Field Inline Picker
Figma & Notion use **per-field highlights** for simultaneous edits:

```
Request Card:
┌─────────────────────────────────────┐
│ Method: [POST ❌ GET]               │ ← Conflict indicator
│          └─→ Server: POST            │ ← Tooltip shows both
│             Your version: GET        │
│                                       │
│ URL: [✓ http://api.v2.example.com]  │ ← Auto-merged (no conflict)
│                                       │
│ Auth: [⚠ bearer | ? basic]           │ ← Two versions, pick one
│       └─→ Accept server (bearer)    │
│           Accept yours (basic)      │
└─────────────────────────────────────┘
```

### Steps
1. Fetch latest version on sync attempt
2. Detect conflicts per field
3. Render conflict UI inline (not modal)
4. User picks per-field resolution
5. Auto-save after resolution
6. Retry with merged state

### Why Not Modal?
- Modals interrupt workflow (Postman, Figma avoid them)
- Inline picker lets user see context
- Less friction than "Resolve All" button

---

## 5. Offline Queue Replay Strategy

### Challenge
Client may have changes queued while server also received changes from other users. Simple replay fails.

### Solution: Incremental 3-Way Merge on Reconnect

```
OnReconnect():
  for each queueItem in syncQueue:
    1. Fetch current server state (version V_server)
    2. Get item's baseline (version V_client_at_queue_time)
    3. Apply 3-way merge(baseline, item.changes, V_server)
    4. If merged successfully (no conflicts):
         Upload merged state with V_server as version
    5. If conflicts:
         Queue conflict for UI resolution
         Don't upload yet (wait for user)
    6. On success: remove from queue, move to next item
```

### Example Replay Sequence

```
Queue item: { id: "req-1", version: 5, dirtyFields: ["url"] }

1. Server current state (version 8):
   { method: "GET", url: "api.v2", headers_json: {...new headers...} }

2. Client baseline (version 5):
   { method: "GET", url: "api.v1", headers_json: {...old headers...} }

3. Client changes (dirty):
   { url: "api.v3" }

4. 3-way merge(baseline, changes, server):
   - url: baseline="api.v1" vs local="api.v3" vs remote="api.v2"
     → CONFLICT (all different)
   - headers: baseline=old vs local=unchanged vs remote=new
     → AUTO-MERGE (client didn't touch, server did)

5. Result:
   {
     url: CONFLICT (user picks "api.v2" or "api.v3"),
     headers: {...new headers...} // auto-merged
   }
```

### Handling Multiple Offline Edits
Queue consolidates multiple user edits into single sync item per request:

```
Queue before reconnect:
  [
    { id: "req-1", v: 5, dirtyFields: ["url"], changes: {url: "v3"} },
    { id: "req-1", v: 5, dirtyFields: ["headers"], changes: {headers: {...}} }
  ]

Merge into single:
  { id: "req-1", v: 5, dirtyFields: ["url", "headers"], changes: {...} }

On reconnect: single 3-way merge, single upload
```

---

## 6. Implementation Checklist

### Server (Node.js / Hono Backend)

- [ ] Add `version INT NOT NULL DEFAULT 1` to requests table
- [ ] Add `updated_at TIMESTAMP` for LWW tiebreaker
- [ ] Implement 3-way merge function in sync handler
- [ ] Return `{ success: false, conflict: {...} }` on version mismatch
- [ ] Implement conflict endpoint: `POST /sync/resolve-conflict` with user choice
- [ ] Add indexes: `(request_id, version)` for fast lookups

### Client (React + Dexie)

- [ ] Add `baseline` field to request store in Dexie
- [ ] Implement `computeDirtyFields(baseline, current)` utility
- [ ] Create `SyncQueueItem` type with dirtyFields tracking
- [ ] Implement 3-way merge function (use it offline & on conflict)
- [ ] Add conflict UI component (inline picker, not modal)
- [ ] Queue changes on every field edit
- [ ] On reconnect: iterate queue with incremental 3-way merge
- [ ] Show "Syncing..." → "Synced" or "Conflict" toast

### Testing

- [ ] Unit test: 3-way merge with all conflict patterns
- [ ] Integration test: offline edit + server change + replay
- [ ] E2E test: two users editing same request concurrently
- [ ] Edge case: three offline edits, server has two changes

---

## 7. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT (React + Dexie)                                      │
│                                                             │
│  Request Component                                          │
│         ↓                                                   │
│  computeDirtyFields() → {url, headers_json}               │
│         ↓                                                   │
│  ┌─────────────────────────────────────┐                  │
│  │ IndexedDB (Dexie)                   │                  │
│  │ ├─ requests: {id, data, baseline}  │                  │
│  │ ├─ syncQueue: {id, v, dirty, ...}  │                  │
│  │ └─ settings: {refresh_token, ...}  │                  │
│  └─────────────────────────────────────┘                  │
│         ↓                                                   │
│  SyncService.onReconnect()                                 │
│  ├─ Iterate queue items                                   │
│  ├─ 3-way merge(baseline, changes, server)               │
│  ├─ If conflict: show UI, wait for user                  │
│  └─ Upload merged state with new version                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│ SERVER (Hono + PostgreSQL)                                  │
│                                                             │
│  PATCH /sync/requests/:id                                 │
│       ↓                                                   │
│  ┌──────────────────────────────────────┐               │
│  │ UPDATE requests                      │               │
│  │ SET method=?, version=version+1      │               │
│  │ WHERE id=? AND version=?             │               │
│  │ RETURNING *;                         │               │
│  └──────────────────────────────────────┘               │
│       ↓                                                   │
│  Success? → Return updated state                         │
│  Version mismatch? → Return 409 CONFLICT                │
│       ↓                                                   │
│  GET /sync/requests/:id (fetch latest)                  │
│       ↓                                                   │
│  Client receives & applies 3-way merge locally          │
│       ↓                                                   │
│  Retry PATCH with merged state                          │
│                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Optimistic locking** (not pessimistic) | Better concurrency; retry on conflict is rare in practice |
| **3-way merge** (not CRDT) | Simpler to implement; structured data doesn't need op-transforms |
| **Per-field conflicts only** | Prevents merge explosion; users understand field-level semantics |
| **Inline conflict UI** | Non-intrusive; aligns with Figma/Notion UX |
| **Auto-merge first** | 80% of conflicts are auto-mergeable (non-overlapping fields) |
| **Queue consolidation** | Single sync item per request → single 3-way merge |
| **Last-Write-Wins on time ties** | Deterministic; avoid cascading conflicts |

---

## 9. Known Limitations & Tradeoffs

**Limitation:** Atomic 3-way merge per request.
- Not suitable for sub-field granularity (e.g., merging two headers separately)
- **Acceptable for Localman:** Requests are small; users rarely edit 5+ fields concurrently

**Limitation:** No async multi-user awareness.
- If user A and B are both editing, conflicts won't appear until sync attempt
- **Acceptable:** Postman also works this way; real-time collaboration is Phase 2+

**Limitation:** "Pick one" resolution discards losing side.
- For text fields, users might want to keep both versions (e.g., append headers)
- **Acceptable Phase 1:** Users can manually edit & re-upload; Phase 2 can add rich merge UI

**Tradeoff:** Optimistic locking assumes low contention.
- If 5 users edit same request simultaneously, expect conflicts & retries
- **Mitigation:** Warn user if conflicts persist (suggest locking/ownership system)

---

## 10. References & Further Reading

**PostgreSQL Optimistic Locking:**
- [PostgreSQL Concurrency Control (MVCC)](https://www.postgresql.org/docs/current/mvcc.html)
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Optimistic & Pessimistic Locking in SQL](https://learning-notes.mistermicheels.com/data/sql/optimistic-pessimistic-locking-sql/)

**Merge Algorithms:**
- [Automerge CRDT](https://github.com/automerge/automerge) — reference implementation
- [A Conflict-Free Replicated JSON Datatype (arxiv)](https://arxiv.org/pdf/1608.03960)
- [Structured Merge via Version Space Algebra (OOPSLA 2018)](https://feihe.github.io/materials/oopsla18.pdf)

**Offline-First & Client-Side Tracking:**
- [Dexie.js Documentation](https://dexie.org/)
- [Using IndexedDB for Offline-First Applications](https://dev.to/hexshift/using-indexeddb-for-offline-first-web-applications-33o0)
- [Implementing Offline-First with IndexedDB and Sync (Medium)](https://medium.com/@sohail_saifii/implementing-offline-first-with-indexeddb-and-sync-a-real-world-guide-0638c8d01056)

**Real-Time Collaboration UX:**
- [Figma's Multiplayer Technology Blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Making Multiplayer More Reliable (Figma)](https://www.figma.com/blog/making-multiplayer-more-reliable/)
- [Building Collaborative Interfaces: OT vs CRDTs](https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo)

**Event-Based Reconciliation:**
- [Event Reconciliation Pattern (Medium)](https://medium.com/@vchauhan76/event-reconciliation-pattern-9a3b261bca42)
- [Operational Transformation Overview](https://grokipedia.com/page/Operational_transformation)

---

## Unresolved Questions

1. **Should we implement conflict resolution on **array fields** (e.g., adding headers simultaneously)?**
   - Current plan: treat as atomic. Revisit if multi-user header edits are common.

2. **What's acceptable **conflict resolution latency** for Phase 2?**
   - If user has 10 queued changes and 5 have conflicts, show all at once or one-by-one UI?

3. **How to handle **request deletion** in merge logic?**
   - What if user A deletes, user B edits same request offline, both sync?
   - Current plan: treat deletion as server-authoritative; warn user & discard local changes.

4. **Should we implement **partial conflict resolution** (resolve some fields, retry for others)?**
   - Current plan: all-or-nothing per request. Simplifies state machine.

5. **Performance: How many queue items can we safely replay in a single reconnect?**
   - Current plan: no limit; test with 100+ queued items to find bottleneck.
