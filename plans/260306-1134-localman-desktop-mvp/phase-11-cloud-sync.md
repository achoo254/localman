# Phase 11 — Cloud Sync (Generic HTTP)

## Context
- [requirement.md Section 3](../../requirement.md) — Sync architecture
- [phase-08-import-export.md](phase-08-import-export.md) — Postman exporter (reused here)
- Depends on: Phase 02, Phase 08, Phase 10

## Overview
- **Priority:** P2
- **Status:** pending
- **Estimate:** 4 days
- **Description:** Bidirectional sync of collections (as Postman Collection v2.1 JSON) to a user-configured HTTP endpoint. No auth UI — user provides raw headers/params. Last-Write-Wins by `updated_at`. Trigger: manual button + auto on app start.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Sync format | Postman Collection v2.1 JSON | Portability, interop, zero vendor lock-in |
| Protocol | Generic HTTP (user configures 4 endpoints) | Works with any server: S3, R2, Nginx, custom API |
| Auth | Custom headers + query params (user input) | No auth UI to build, user controls their server |
| Conflict | Last-Write-Wins by `updated_at` | Simple, sufficient for single-user |
| Scope | Collections only | Environments/history are device-local |
| `updated_at` in JSON | Embedded as `x-localman-updated-at` in `info` | Standard Postman extension field, ignored by Postman |

---

## Requirements

### Functional
- Sync settings panel in Settings page:
  - 4 URL fields: List, Download `{filename}`, Upload `{filename}`, Delete `{filename}`
  - Custom request headers table (key-value)
  - Custom query params table (key-value)
  - "Enable Cloud Sync" toggle
  - "Sync Now" manual trigger button
- Auto-sync on app start (if enabled, non-blocking)
- Sync status indicator in titlebar (idle / syncing / last synced time / error)
- Per-collection sync: upload if local newer, download if server newer, create if missing on either side
- Deleted collections: if user deletes locally, optionally delete on server (with confirmation)

### Non-Functional
- Sync runs in background, never blocks UI
- Show progress for large collections (>50 requests)
- Sync errors shown as toast (non-fatal)
- Sync config stored locally in `settings` table (never uploaded)

---

## Architecture

### Postman Collection v2.1 with `updated_at`

```json
{
  "info": {
    "_postman_id": "uuid-of-collection",
    "name": "My API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "x-localman-updated-at": "2026-03-06T10:00:05.000Z"
  },
  "item": [ ... ],
  "variable": [ ... ]
}
```

**File naming on server:** `{collection-id}.json` (UUID-based, stable across renames)

### Sync Config (stored in `settings` table)

```typescript
interface SyncConfig {
  enabled: boolean;
  endpoints: {
    list: string;         // GET → returns JSON array of { filename, updated_at? }
    download: string;     // GET {filename} → returns Postman JSON
    upload: string;       // PUT {filename} → body = Postman JSON
    delete: string;       // DELETE {filename}
  };
  headers: KeyValuePair[];   // e.g. Authorization: Bearer token
  params: KeyValuePair[];    // e.g. workspace: my-team
  lastSyncAt: string | null;
}
```

### Sync Algorithm

```
syncAll():
  1. Fetch server file list → `[{ filename: string, updated_at: string }]`
     - **Server MUST return `updated_at` in list response** (locked schema — no slow-path fallback)

  2. Get all local collections from DB

  3. Build reconcile map:
     - server_only   → download + create locally
     - local_only    → upload to server
     - both_exist    → compare updated_at → upload or download

  4. Execute uploads and downloads in parallel (max concurrency: 3)

  5. Update settings.lastSyncAt = now
```

### LWW Conflict Resolution

```typescript
function reconcile(local: Collection, serverUpdatedAt: string): 'upload' | 'download' | 'skip' {
  const localTime = new Date(local.updated_at).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();
  if (localTime > serverTime) return 'upload';
  if (serverTime > localTime) return 'download';
  return 'skip';
}
```

### Zustand Store — `sync-store.ts`

```typescript
interface SyncStore {
  status: 'idle' | 'syncing' | 'error';
  lastSyncAt: string | null;
  error: string | null;
  progress: { current: number; total: number } | null;

  syncAll: () => Promise<void>;
  uploadCollection: (collectionId: string) => Promise<void>;
  downloadCollection: (filename: string) => Promise<void>;
  cancelSync: () => void;
}
```

---

## Serialization: Postman v2.1 ↔ Localman

Extend the existing Postman exporter from Phase 08:

### `src/services/exporters/postman-exporter.ts` (extend)
- Add `info['x-localman-updated-at'] = collection.updated_at`
- Add `info['_postman_id'] = collection.id` (use collection UUID as Postman ID)

### `src/services/importers/postman-importer.ts` (extend)
- Read `info['x-localman-updated-at']` → set as `updated_at` on import
- Read `info['_postman_id']` → use as collection `id` (preserves identity across sync)

---

## Related Code Files

### Create
- `src/services/sync/sync-service.ts` — Core sync algorithm (syncAll, upload, download)
- `src/services/sync/sync-http-client.ts` — HTTP calls with user-configured endpoints + headers/params
- `src/stores/sync-store.ts` — Sync state (status, progress, errors)
- `src/components/settings/sync-settings.tsx` — Sync config UI (endpoints, headers, params, toggle)
- `src/components/layout/sync-status-indicator.tsx` — Titlebar sync badge

### Modify
- `src/services/exporters/postman-exporter.ts` — Add `x-localman-updated-at` to `info`
- `src/services/importers/postman-importer.ts` — Read `x-localman-updated-at` and `_postman_id` on import
- `src/components/settings/settings-page.tsx` — Add "Cloud Sync" section
- `src/components/layout/titlebar.tsx` — Add sync status indicator
- `src/utils/app-initializer.ts` — Trigger auto-sync on startup

---

## Implementation Steps

1. **Extend Postman serializer/deserializer**
   - `postman-exporter.ts`: add `x-localman-updated-at` + `_postman_id` to `info`
   - `postman-importer.ts`: read back these fields to preserve identity + timestamp

2. **Build sync HTTP client**
   - Generic client that accepts `SyncConfig` (endpoints, headers, params)
   - `list()` → GET list endpoint, parse response (handle arrays of strings or objects)
   - `download(filename)` → GET download endpoint with `{filename}` substituted
   - `upload(filename, body)` → PUT upload endpoint
   - `delete(filename)` → DELETE endpoint
   - Apply all custom headers + query params to every request

3. **Build sync service**
   - `syncAll()`: reconcile algorithm, parallel execution (Promise.all with concurrency limit)
   - `uploadCollection(id)`: serialize → upload
   - `downloadCollection(filename)`: download → deserialize → upsert in DB
   - Handle errors per-collection (one failure doesn't stop rest)

4. **Build sync Zustand store**
   - Wrap sync service, track status/progress/errors
   - Expose to UI for status indicator + manual trigger

5. **Build sync settings UI**
   - 4 URL inputs with placeholder examples (e.g., `https://my-server.com/sync/{filename}`)
   - Headers table (reuse key-value editor from Phase 03)
   - Params table (same)
   - "Test Connection" button (calls list endpoint, shows result count)
   - "Sync Now" button
   - Enable/disable toggle

6. **Build sync status indicator (titlebar)**
   - Icon states: cloud-off (disabled), cloud (idle), loader (syncing), cloud-alert (error)
   - Tooltip: "Last synced: X minutes ago" or error message
   - Click: open sync settings or trigger manual sync

7. **Integrate auto-sync on startup**
   - In `app-initializer.ts` (Phase 00 pattern): if enabled → `syncStore.syncAll().catch(console.error)`

8. **Handle collection delete sync**
   - When user deletes a collection locally: ask "Also delete from cloud sync server?"
   - If yes → call delete endpoint

---

## Todo List
- [ ] Extend postman-exporter with `x-localman-updated-at` + `_postman_id`
- [ ] Extend postman-importer to read back those fields
- [ ] Build sync HTTP client (configurable endpoints + headers + params)
- [ ] Build sync service (reconcile algorithm)
- [ ] Build sync Zustand store
- [ ] Build sync settings UI (4 URLs + headers + params + test connection)
- [ ] Build sync status indicator in titlebar
- [ ] Integrate auto-sync in app-initializer
- [ ] Handle delete propagation to server
- [ ] Handle partial failures gracefully (toast per error)
- [ ] Unit test: reconcile algorithm, serialization roundtrip

---

## Success Criteria
- User enters 4 URLs + optional headers → syncs collections bidirectionally
- Postman opens imported JSON without errors (valid v2.1 format)
- `x-localman-updated-at` survives roundtrip (export → server → import → same timestamp)
- LWW: newer side wins, no data loss
- Sync runs on startup without blocking app UI
- "Test Connection" gives clear success/failure feedback
- Partial failure (1 collection fails) → others still sync, error toasted

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Server list response format varies | Parse both `string[]` and `{filename, updated_at}[]` — fall back to downloading files for timestamp |
| `{filename}` substitution edge cases | Encode filename in URL, document expected server behavior |
| Large collections (1000+ requests) | Chunked upload? No — Postman JSON for 1000 requests is ~500KB, fine |
| Server returns 404 on delete (already gone) | Treat 404 on delete as success |
| `updated_at` clock skew between devices | Use ISO 8601 UTC strings, client clocks — acceptable for single-user LWW |

---

## Security Considerations
- Sync config (URLs, headers with tokens) stored in IndexedDB — same security as rest of app data
- HTTPS strongly recommended for any sync endpoint (show warning if user enters `http://`)
- Never log sync headers/params to console or history
- "Test Connection" only calls list endpoint — no data exposed in test

---

## Next Steps
- Phase 2 planning: Full backend sync with auth, teams, real-time
