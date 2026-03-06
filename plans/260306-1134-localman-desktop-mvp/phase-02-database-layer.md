# Phase 02 — Database Layer (Dexie.js + IndexedDB)

## Context
- [Dexie.js docs](https://dexie.org)
- [requirement.md Section 3](../../requirement.md) — IndexedDB schema
- Depends on: Phase 01

## Overview
- **Priority:** P1 (blocking phases 3-9)
- **Status:** pending
- **Estimate:** 3 days
- **Description:** Implement IndexedDB data layer with Dexie.js — schema, models, CRUD services, auto-save hooks.

## Key Insights
- Dexie.js v4 supports `liveQuery` for reactive queries (replaces manual subscriptions)
- Use Dexie's versioning system for schema migrations
- All data ops go through service layer — never access Dexie tables directly from components
- Auto-save: debounce writes (300ms) to avoid excessive IndexedDB ops
- UUIDs for entity IDs (crypto.randomUUID()) — needed for future sync

## Requirements

### Functional
- CRUD for: collections, requests, folders, environments, history, settings
- Auto-save on any change (debounced)
- Schema migration support
- Bulk operations (delete collection cascades to requests)
- Full data export/import (JSON backup)

### Non-Functional
- Read < 10ms for single entity
- Write < 50ms for single entity
- Support 10K+ requests in DB without perf degradation

## Architecture

### DB Schema (Dexie v1)

```typescript
// src/db/schema.ts
class LocalmanDB extends Dexie {
  collections!: Table<Collection>;
  folders!: Table<Folder>;
  requests!: Table<ApiRequest>;
  environments!: Table<Environment>;
  history!: Table<HistoryEntry>;
  settings!: Table<Setting>;

  constructor() {
    super('localman');
    this.version(1).stores({
      collections: 'id, name, updated_at',
      folders: 'id, collection_id, parent_id, updated_at',
      requests: 'id, collection_id, folder_id, updated_at',
      environments: 'id, name, updated_at',
      history: '++id, request_id, timestamp, method, status_code',
      settings: 'key',
    });
  }
}
```

**Key decision:** Separate `folders` table (not nested in collections) — enables drag-drop reordering and deep nesting.

### TypeScript Interfaces

```typescript
interface Collection {
  id: string;           // UUID
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;   // ISO 8601
  updated_at: string;
}

interface Folder {
  id: string;
  collection_id: string;
  parent_id: string | null;  // null = root level
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ApiRequest {
  id: string;
  collection_id: string;
  folder_id: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  pre_script?: string;
  post_script?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HistoryEntry {
  id?: number;          // auto-increment
  request_id: string;
  method: HttpMethod;
  url: string;
  status_code: number;
  response_time: number; // ms
  response_size: number; // bytes
  request_snapshot: Partial<ApiRequest>;
  response_body?: string;
  response_headers?: Record<string, string>;
  timestamp: string;
}

interface Setting {
  key: string;
  value: unknown;
}
```

### Service Layer Pattern

```
Component -> useStore (Zustand) -> dbService -> Dexie table -> IndexedDB
                                      |
                              auto-save (debounced)
```

## Related Code Files

### Create
- `src/db/database.ts` — Dexie DB class + singleton
- `src/db/migrations.ts` — Schema version history
- `src/types/models.ts` — All TypeScript interfaces
- `src/types/enums.ts` — HttpMethod, BodyType, AuthType enums
- `src/types/common.ts` — KeyValuePair, RequestBody, AuthConfig
- `src/db/services/collection-service.ts` — Collection CRUD
- `src/db/services/folder-service.ts` — Folder CRUD
- `src/db/services/request-service.ts` — Request CRUD
- `src/db/services/environment-service.ts` — Environment CRUD
- `src/db/services/history-service.ts` — History log/query
- `src/db/services/settings-service.ts` — Key-value settings
- `src/db/services/backup-service.ts` — Full export/import
- `src/hooks/use-live-query.ts` — Dexie liveQuery React hook wrapper

## Implementation Steps

1. **Define TypeScript types**
   - Create all interfaces in `src/types/models.ts`
   - Define enums: `HttpMethod`, `BodyType`, `AuthType` in `src/types/enums.ts`
   - Define shared types: `KeyValuePair`, `RequestBody`, `AuthConfig` in `src/types/common.ts`

2. **Create Dexie database class**
   - `src/db/database.ts`: extend Dexie, define stores, export singleton
   - Version 1 schema with all indexes

3. **Implement service layer**
   - Each service: `getAll()`, `getById()`, `create()`, `update()`, `delete()`
   - Collection service: cascade delete (folders + requests)
   - Request service: duplicate, move to folder/collection
   - History service: log entry, query with filters, clear history
   - Settings service: get/set typed settings
   - All writes set `updated_at = new Date().toISOString()`
   - All creates generate `id = crypto.randomUUID()`

4. **Implement backup service**
   - `exportAll()`: dump all tables to JSON
   - `importAll(data)`: validate + bulk insert (transaction)
   - Include schema version in export for future compat

5. **Create liveQuery hook**
   - Wrap Dexie `liveQuery` in React hook for reactive UI updates
   - Auto-rerender when DB changes

6. **Write basic integration test**
   - CRUD cycle for each entity
   - Cascade delete test
   - Backup export/import roundtrip

## Todo List
- [ ] Define TypeScript interfaces and enums
- [ ] Create Dexie DB class with schema v1
- [ ] Implement collection service (CRUD + cascade delete)
- [ ] Implement folder service (CRUD + tree ops)
- [ ] Implement request service (CRUD + duplicate + move)
- [ ] Implement environment service (CRUD + active toggle)
- [ ] Implement history service (log + query + clear)
- [ ] Implement settings service (get/set)
- [ ] Implement backup service (export/import)
- [ ] Create liveQuery React hook
- [ ] Integration tests

## Success Criteria
- All CRUD ops work for every entity
- Cascade delete removes children
- liveQuery triggers UI updates on DB changes
- Export/import preserves all data
- No TypeScript errors

## Risk Assessment
- IndexedDB storage limits: browsers cap ~50% of disk, Tauri webview follows same rules. For MVP, this is fine (API collections are small).
- Dexie v4 liveQuery requires `useLiveQuery` from `dexie-react-hooks` — verify compatibility.

## Next Steps
- Phase 03: Request Builder UI
