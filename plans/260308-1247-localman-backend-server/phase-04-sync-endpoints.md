# Phase 04: Sync Endpoints

## Context Links
- [Plan overview](./plan.md)
- [Phase 02: Database Schema](./phase-02-database-schema.md)
- [Phase 03: Auth Endpoints](./phase-03-auth-endpoints.md)
- Client sync HTTP client: `src/services/sync/sync-http-client.ts`
- Client sync service: `src/services/sync/sync-service.ts`
- Client sync types: `src/types/sync.ts`

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 4h
- **Description:** Implement 4 file-based sync endpoints that are backward-compatible with the existing client `SyncConfig.endpoints` contract.

## Key Insights

### Client Contract (MUST match exactly)

The client `sync-http-client.ts` calls these 4 operations:

| Client function | HTTP | URL pattern | Body | Response |
|---|---|---|---|---|
| `listFiles(config)` | GET | `config.endpoints.list` | none | `[{filename, updated_at?}]` |
| `downloadFile(config, fn)` | GET | `config.endpoints.download` with `{filename}` replaced | none | raw text (Postman JSON) |
| `uploadFile(config, fn, body)` | PUT | `config.endpoints.upload` with `{filename}` replaced | JSON string | any (checks `res.ok`) |
| `deleteFile(config, fn)` | DELETE | `config.endpoints.delete` with `{filename}` replaced | none | any (404 = ok, checks `res.ok`) |

**Client URL template example:**
```
list:     https://api.example.com/api/sync/list
download: https://api.example.com/api/sync/download/{filename}
upload:   https://api.example.com/api/sync/upload/{filename}
delete:   https://api.example.com/api/sync/delete/{filename}
```

The client replaces `{filename}` with `encodeURIComponent(filename)` and applies custom headers/params from `SyncConfig`.

### Auth via Custom Headers

The client passes auth via `SyncConfig.headers` (user-configured key-value pairs). For our backend, the user would add:
```
Authorization: Bearer {accessToken}
```
as a header in the sync settings UI. The backend uses the same `verifyAuth` preHandler from Phase 03.

### Server is a "dumb file store"

- No parsing of JSON content
- No conflict resolution server-side (client `reconcile()` handles LWW)
- `updated_at` returned in list response so client can compare timestamps
- Content stored as raw TEXT in `user_files` table

## Requirements

### Functional

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/sync/list` | GET | Bearer | Return all files for authenticated user |
| `/api/sync/download/:filename` | GET | Bearer | Return file content as text |
| `/api/sync/upload/:filename` | PUT | Bearer | Upsert file content |
| `/api/sync/delete/:filename` | DELETE | Bearer | Delete file (204 on success, 204 on not-found) |

### Response Formats

**GET /api/sync/list**
```json
[
  { "filename": "abc-123.json", "updated_at": "2026-03-08T10:30:00.000Z" },
  { "filename": "def-456.json", "updated_at": "2026-03-08T09:15:00.000Z" }
]
```
Returns empty array `[]` if no files.

**GET /api/sync/download/:filename**
```
Content-Type: text/plain (or application/json)
Body: raw Postman JSON text as-is from DB
```
Returns 404 if file not found.

**PUT /api/sync/upload/:filename**
```
Request Content-Type: application/json
Request Body: raw Postman JSON text
Response: 200 { "ok": true, "updated_at": "..." }
```
- If file exists for user → update content + updated_at
- If file doesn't exist → insert new record

**DELETE /api/sync/delete/:filename**
```
Response: 204 No Content (whether file existed or not)
```
Client already handles 404 as success (see `deleteFile` in sync-http-client.ts).

### Non-Functional
- All endpoints require valid Bearer token (verifyAuth preHandler)
- Filename validated: must match `^[a-zA-Z0-9_-]+\.json$`
- Max upload body size: 10MB (configurable)
- Rate limit: 100 req / 15 min per user (global default)

## Architecture

### Data Flow
```
Client syncAll()
  │
  ├─ 1. GET /api/sync/list
  │     → SELECT filename, updated_at FROM user_files WHERE user_id = :uid
  │     → Return JSON array
  │
  ├─ 2. Client reconcile() compares local vs server updated_at
  │     → Decides: upload / download / skip per collection
  │
  ├─ 3. For each "upload" decision:
  │     PUT /api/sync/upload/{collectionId}.json
  │       → Body = exportToPostman() JSON
  │       → UPSERT user_files (user_id, filename, content, updated_at = NOW())
  │
  ├─ 4. For each "download" decision:
  │     GET /api/sync/download/{collectionId}.json
  │       → Returns stored JSON text
  │       → Client calls importPostmanCollection()
  │
  └─ 5. For deleted collections:
        DELETE /api/sync/delete/{collectionId}.json
          → DELETE FROM user_files WHERE user_id = :uid AND filename = :fn
```

### Database Queries

**List:**
```sql
SELECT filename, updated_at
FROM user_files
WHERE user_id = $1
ORDER BY filename;
```

**Download:**
```sql
SELECT content
FROM user_files
WHERE user_id = $1 AND filename = $2;
```

**Upload (upsert):**
```sql
INSERT INTO user_files (user_id, filename, content, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, filename)
DO UPDATE SET content = $3, updated_at = NOW();
```

**Delete:**
```sql
DELETE FROM user_files
WHERE user_id = $1 AND filename = $2;
```

## Related Code Files

### Create
- `backend/src/routes/sync/list.ts`
- `backend/src/routes/sync/download.ts`
- `backend/src/routes/sync/upload.ts`
- `backend/src/routes/sync/delete.ts`
- `backend/src/services/sync-service.ts`

### Modify
- `backend/src/server.ts` — register sync routes with prefix + auth preHandler

## Implementation Steps

### Step 1: Create sync service — `src/services/sync-service.ts`

```typescript
import { db } from '../db/client.js';
import { userFiles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function listUserFiles(userId: string) {
  return db.select({
    filename: userFiles.filename,
    updated_at: userFiles.updatedAt,
  })
    .from(userFiles)
    .where(eq(userFiles.userId, userId))
    .orderBy(userFiles.filename);
}

export async function getUserFile(userId: string, filename: string) {
  const [file] = await db.select({ content: userFiles.content })
    .from(userFiles)
    .where(and(
      eq(userFiles.userId, userId),
      eq(userFiles.filename, filename)
    ))
    .limit(1);
  return file ?? null;
}

export async function upsertUserFile(userId: string, filename: string, content: string) {
  const now = new Date();
  const [result] = await db.insert(userFiles)
    .values({ userId, filename, content, updatedAt: now })
    .onConflictDoUpdate({
      target: [userFiles.userId, userFiles.filename],
      set: { content, updatedAt: now },
    })
    .returning({ updatedAt: userFiles.updatedAt });
  return result;
}

export async function deleteUserFile(userId: string, filename: string) {
  await db.delete(userFiles)
    .where(and(
      eq(userFiles.userId, userId),
      eq(userFiles.filename, filename)
    ));
}
```

### Step 2: Create filename validation helper

Add to `src/utils/errors.ts` or inline:
```typescript
const FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.json$/;

export function validateFilename(filename: string): boolean {
  return FILENAME_REGEX.test(filename) && filename.length <= 255;
}
```

### Step 3: Create list route — `src/routes/sync/list.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { listUserFiles } from '../../services/sync-service.js';

export default async function listRoute(fastify: FastifyInstance) {
  fastify.get('/list', {
    preHandler: [fastify.verifyAuth],
  }, async (request) => {
    const { sub } = request.user;
    const files = await listUserFiles(sub);
    // Return format matching client ServerFileEntry: { filename, updated_at? }
    return files.map(f => ({
      filename: f.filename,
      updated_at: f.updated_at.toISOString(),
    }));
  });
}
```

### Step 4: Create download route — `src/routes/sync/download.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { getUserFile } from '../../services/sync-service.js';
import { validateFilename } from '../../utils/errors.js';

export default async function downloadRoute(fastify: FastifyInstance) {
  fastify.get<{ Params: { filename: string } }>('/download/:filename', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const { filename } = request.params;

    if (!validateFilename(filename)) {
      return reply.code(400).send({ error: 'Invalid filename', code: 'VALIDATION_ERROR' });
    }

    const { sub } = request.user;
    const file = await getUserFile(sub, filename);

    if (!file) {
      return reply.code(404).send({ error: 'File not found', code: 'NOT_FOUND' });
    }

    reply.type('application/json');
    return reply.send(file.content);
  });
}
```

### Step 5: Create upload route — `src/routes/sync/upload.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { upsertUserFile } from '../../services/sync-service.js';
import { validateFilename } from '../../utils/errors.js';

export default async function uploadRoute(fastify: FastifyInstance) {
  fastify.put<{ Params: { filename: string } }>('/upload/:filename', {
    preHandler: [fastify.verifyAuth],
    config: {
      // Allow raw text body up to 10MB
      rawBody: true,
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB
  }, async (request, reply) => {
    const { filename } = request.params;

    if (!validateFilename(filename)) {
      return reply.code(400).send({ error: 'Invalid filename', code: 'VALIDATION_ERROR' });
    }

    const { sub } = request.user;

    // Body is JSON text (client sends Content-Type: application/json)
    // Fastify auto-parses JSON, but we need the raw string
    // Store the stringified version
    const content = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    const result = await upsertUserFile(sub, filename, content);

    return reply.send({
      ok: true,
      updated_at: result.updatedAt.toISOString(),
    });
  });
}
```

### Step 6: Create delete route — `src/routes/sync/delete.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { deleteUserFile } from '../../services/sync-service.js';
import { validateFilename } from '../../utils/errors.js';

export default async function deleteRoute(fastify: FastifyInstance) {
  fastify.delete<{ Params: { filename: string } }>('/delete/:filename', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const { filename } = request.params;

    if (!validateFilename(filename)) {
      return reply.code(400).send({ error: 'Invalid filename', code: 'VALIDATION_ERROR' });
    }

    const { sub } = request.user;
    await deleteUserFile(sub, filename);

    return reply.code(204).send();
  });
}
```

### Step 7: Register sync routes in `src/server.ts`

```typescript
// After auth routes
await fastify.register(import('./routes/sync/list.js'), { prefix: '/api/sync' });
await fastify.register(import('./routes/sync/download.js'), { prefix: '/api/sync' });
await fastify.register(import('./routes/sync/upload.js'), { prefix: '/api/sync' });
await fastify.register(import('./routes/sync/delete.js'), { prefix: '/api/sync' });
```

### Step 8: Handle raw body for upload

Fastify auto-parses JSON bodies. Since client sends `Content-Type: application/json`, Fastify will parse it into an object. We need to re-stringify it for storage. Two options:

**Option A (simple):** Accept parsed JSON, stringify for storage (Step 5 above).

**Option B (preserve exact bytes):** Add `addContentTypeParser` for `application/json` on the upload route to get raw string. Only use if exact byte preservation matters.

Recommendation: **Option A** — simpler, and re-stringified JSON is functionally identical.

### Step 9: Client configuration

User configures SyncConfig in Localman settings UI:
```
List:     https://your-server.com/api/sync/list
Download: https://your-server.com/api/sync/download/{filename}
Upload:   https://your-server.com/api/sync/upload/{filename}
Delete:   https://your-server.com/api/sync/delete/{filename}

Headers:
  Authorization: Bearer <paste-access-token-here>
```

**Note for future improvement:** The client could auto-configure these endpoints from a single server URL. But for Phase A, manual configuration is fine — matches the existing generic sync UI.

### Step 10: Test end-to-end sync flow

```bash
# 1. Register + get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq -r '.accessToken')

# 2. Upload a file
curl -X PUT http://localhost:3000/api/sync/upload/test-collection.json \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"info":{"name":"Test"},"item":[]}'

# 3. List files
curl http://localhost:3000/api/sync/list \
  -H "Authorization: Bearer $TOKEN"
# Expect: [{"filename":"test-collection.json","updated_at":"..."}]

# 4. Download file
curl http://localhost:3000/api/sync/download/test-collection.json \
  -H "Authorization: Bearer $TOKEN"
# Expect: {"info":{"name":"Test"},"item":[]}

# 5. Delete file
curl -X DELETE http://localhost:3000/api/sync/delete/test-collection.json \
  -H "Authorization: Bearer $TOKEN"
# Expect: 204

# 6. List again (should be empty)
curl http://localhost:3000/api/sync/list \
  -H "Authorization: Bearer $TOKEN"
# Expect: []
```

## Todo List
- [ ] Create sync-service.ts with list/get/upsert/delete functions
- [ ] Add validateFilename helper to utils/errors.ts
- [ ] Create list route
- [ ] Create download route
- [ ] Create upload route (with body size limit)
- [ ] Create delete route
- [ ] Register all sync routes in server.ts with `/api/sync` prefix
- [ ] Handle JSON body → string conversion for storage
- [ ] Test full sync flow: upload → list → download → delete
- [ ] Test auth: requests without Bearer token return 401
- [ ] Test edge cases: invalid filename, large body, empty list
- [ ] Run `tsc --noEmit`

## Success Criteria
- List returns `[{filename, updated_at}]` matching client `ServerFileEntry` type
- Download returns raw JSON text with correct content-type
- Upload creates new file on first call, updates on subsequent calls
- Delete returns 204 whether file exists or not
- All endpoints return 401 without valid Bearer token
- Invalid filenames (path traversal, special chars) rejected with 400
- Files are user-scoped: user A cannot see/modify user B's files
- Client `syncAll()` works end-to-end with these endpoints configured

## Risk Assessment
| Risk | Mitigation |
|---|---|
| JSON re-stringify changes formatting | Functionally identical; client re-imports anyway |
| Large collections exceed body limit | 10MB limit generous for Postman JSON; configurable |
| Filename URL encoding issues | Client uses `encodeURIComponent`; Fastify auto-decodes params |
| User data isolation | All queries filter by `user_id` from JWT; no cross-user access possible |

## Security Considerations
- All endpoints behind `verifyAuth` preHandler (JWT + Redis blacklist check)
- User isolation: every query includes `WHERE user_id = :uid`
- Filename validation prevents path traversal (`../` blocked by regex)
- Body size limit prevents DoS via large uploads
- No file content parsing — stored/returned as opaque text (no injection risk)

## Next Steps
- Consider adding `GET /api/sync/status` returning server time for clock sync
- Future: auto-configure sync endpoints from server URL in client settings
- Future: add ETag/If-None-Match for download caching
