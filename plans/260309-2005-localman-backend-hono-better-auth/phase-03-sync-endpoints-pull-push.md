# Phase 03 — Sync Endpoints: Pull/Push

## Context Links

- [Plan overview](./plan.md)
- [Phase 02 — Database Schema](./phase-02-database-schema-and-auth.md)
- [Client sync service](../../src/services/sync/sync-service.ts)
- [Client sync HTTP client](../../src/services/sync/sync-http-client.ts)
- [Client sync types](../../src/types/sync.ts)
- [Brainstorm](../reports/brainstorm-260309-1951-localman-backend-hono-better-auth.md)

## Overview

- **Priority:** P1
- **Status:** complete
- **Effort:** 3h
- **Description:** Implement `GET /api/sync/pull` and `POST /api/sync/push` endpoints. Server acts as dumb JSON store — accepts whatever client sends, returns what it has. Client handles LWW reconciliation.

## Key Insights

- Current client uses file-based API (list/download/upload/delete endpoints). New pull/push is a different paradigm — **client code must be updated in Phase 05**
- Pull returns all user's files since a given timestamp (or all if first sync)
- Push receives batch of upserts + deletions in one request
- Server does upsert via `ON CONFLICT (user_id, filename) DO UPDATE`
- `entity_type` distinguishes collections from environments for filtering
- Deletions are hard deletes (no soft delete for Phase A)

## Requirements

### Functional

**GET /api/sync/pull**
- Requires auth (Bearer JWT)
- Query params: `?since=ISO8601` (optional), `?type=collection|environment` (optional)
- Returns: `{ files: [{ filename, entityType, content, updatedAt }], serverTime }`
- If `since` provided, return only files with `updated_at > since`
- If no `since`, return all user's files
- `serverTime` = current server timestamp (client uses for next `since`)

**POST /api/sync/push**
- Requires auth (Bearer JWT)
- Body: `{ changes: [{ filename, entityType, content, updatedAt }], deletions: [string] }`
- Upserts each change into `user_files`
- Deletes files by filename from `deletions` array
- Returns: `{ synced: number, deleted: number, serverTime }`
- Server trusts client's `updatedAt` — just stores it
- Max body size: 10MB (configurable)

**Validation:**
- `entityType` must be `collection` or `environment`
- `filename` max 255 chars
- `content` must be valid JSON object
- `deletions` items must be non-empty strings

### Non-Functional
- Response time < 100ms for typical sync (< 50 files)
- Auth guard rejects unauthenticated requests before any DB query
- Batch operations use transactions

## Architecture

### Pull Flow

```
Client                          Server
  │ GET /api/sync/pull?since=T    │
  │ Authorization: Bearer <jwt>   │
  │──────────────────────────────>│
  │                               │ Validate JWT → extract userId
  │                               │ SELECT * FROM user_files
  │                               │   WHERE user_id = $1
  │                               │   AND updated_at > $since
  │<──────────────────────────────│
  │ { files: [...], serverTime }  │
  │                               │
  │ Client runs LWW reconcile     │
  │ against local IndexedDB       │
```

### Push Flow

```
Client                          Server
  │ POST /api/sync/push           │
  │ { changes: [...],             │
  │   deletions: [...] }          │
  │──────────────────────────────>│
  │                               │ Validate JWT → extract userId
  │                               │ BEGIN TRANSACTION
  │                               │   UPSERT changes into user_files
  │                               │   DELETE files in deletions list
  │                               │ COMMIT
  │<──────────────────────────────│
  │ { synced: N, deleted: M,      │
  │   serverTime }                │
```

## Related Code Files

### Create
- `backend/src/routes/sync.ts` — Pull and Push route handlers

### Modify
- `backend/src/app.ts` — Mount sync router

## Implementation Steps

### 1. Create Zod schemas for validation

In `backend/src/routes/sync.ts`:

```typescript
import { z } from "zod";

const pullQuerySchema = z.object({
  since: z.string().datetime().optional(),
  type: z.enum(["collection", "environment"]).optional(),
});

const pushBodySchema = z.object({
  changes: z.array(
    z.object({
      filename: z.string().min(1).max(255),
      entityType: z.enum(["collection", "environment"]),
      content: z.record(z.unknown()), // any JSON object
      updatedAt: z.string().datetime(),
    })
  ).default([]),
  deletions: z.array(z.string().min(1).max(255)).default([]),
});
```

### 2. Implement Pull endpoint

```typescript
import { Hono } from "hono";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/client";
import { userFiles } from "../db/schema";
import { requireAuth } from "../middleware/auth-guard";
import type { AppVariables } from "../types/context";

export const syncRouter = new Hono<{ Variables: AppVariables }>();

syncRouter.use(requireAuth);

syncRouter.get("/sync/pull", async (c) => {
  const user = c.get("user")!;
  const query = pullQuerySchema.parse(c.req.query());

  const conditions = [eq(userFiles.userId, user.id)];

  if (query.since) {
    conditions.push(gt(userFiles.updatedAt, new Date(query.since)));
  }
  if (query.type) {
    conditions.push(eq(userFiles.entityType, query.type));
  }

  const files = await db
    .select({
      filename: userFiles.filename,
      entityType: userFiles.entityType,
      content: userFiles.content,
      updatedAt: userFiles.updatedAt,
    })
    .from(userFiles)
    .where(and(...conditions));

  return c.json({
    files: files.map((f) => ({
      ...f,
      updatedAt: f.updatedAt.toISOString(),
    })),
    serverTime: new Date().toISOString(),
  });
});
```

### 3. Implement Push endpoint

```typescript
syncRouter.post("/sync/push", async (c) => {
  const user = c.get("user")!;
  const body = pushBodySchema.parse(await c.req.json());

  let synced = 0;
  let deleted = 0;

  // Use raw SQL for upsert since Drizzle's onConflictDoUpdate needs it
  await db.transaction(async (tx) => {
    // Upsert changes
    for (const change of body.changes) {
      await tx
        .insert(userFiles)
        .values({
          userId: user.id,
          filename: change.filename,
          entityType: change.entityType,
          content: change.content,
          updatedAt: new Date(change.updatedAt),
        })
        .onConflictDoUpdate({
          target: [userFiles.userId, userFiles.filename],
          set: {
            entityType: change.entityType,
            content: change.content,
            updatedAt: new Date(change.updatedAt),
          },
        });
      synced++;
    }

    // Delete files
    for (const filename of body.deletions) {
      const result = await tx
        .delete(userFiles)
        .where(
          and(
            eq(userFiles.userId, user.id),
            eq(userFiles.filename, filename)
          )
        );
      deleted++;
    }
  });

  return c.json({
    synced,
    deleted,
    serverTime: new Date().toISOString(),
  });
});
```

### 4. Mount sync router in app.ts

Add to `backend/src/app.ts`:

```typescript
import { syncRouter } from "./routes/sync";

// After healthRouter
app.route("/api", syncRouter);
```

### 5. Configure body size limit

Add to `app.ts` before routes:

```typescript
import { bodyLimit } from "hono/body-limit";

app.use("/api/sync/push", bodyLimit({ maxSize: 10 * 1024 * 1024 })); // 10MB
```

### 6. Add rate limiting on sync endpoints

```typescript
// Optional: rate limit sync to prevent abuse
// Hono doesn't have built-in rate limiting — use simple in-memory for Phase A
// For production, use Redis-backed rate limiter
```

**Decision:** Skip rate limiting for Phase A. Add in Phase B if needed.

### 7. Test Pull endpoint

```bash
# Get JWT token from login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testtest123"}' | jq -r '.token')

# Pull all files (empty at first)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/sync/pull
# Expected: { "files": [], "serverTime": "..." }
```

### 8. Test Push endpoint

```bash
# Push a collection
curl -X POST http://localhost:3001/api/sync/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "changes": [{
      "filename": "abc123.json",
      "entityType": "collection",
      "content": {"info":{"name":"My API"},"item":[]},
      "updatedAt": "2026-03-09T12:00:00.000Z"
    }],
    "deletions": []
  }'
# Expected: { "synced": 1, "deleted": 0, "serverTime": "..." }

# Pull again — should return the file
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/sync/pull
# Expected: { "files": [{ "filename": "abc123.json", ... }], "serverTime": "..." }
```

### 9. Test incremental pull with `since`

```bash
# Pull only files updated after a timestamp
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/sync/pull?since=2026-03-09T11:00:00.000Z"
# Should return the file pushed after that time

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/sync/pull?since=2026-03-09T13:00:00.000Z"
# Should return empty — no files after that time
```

### 10. Test deletion

```bash
curl -X POST http://localhost:3001/api/sync/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "changes": [], "deletions": ["abc123.json"] }'
# Expected: { "synced": 0, "deleted": 1, "serverTime": "..." }
```

## Todo List

- [x] Create Zod validation schemas
- [x] Implement `GET /api/sync/pull` with `since` and `type` filters
- [x] Implement `POST /api/sync/push` with upsert + delete
- [x] Mount syncRouter in app.ts
- [x] Add body size limit (10MB)
- [x] Test pull (empty, with data, with `since` filter)
- [x] Test push (upsert, overwrite, deletion)
- [x] Test auth guard rejects unauthenticated requests
- [x] Test user isolation (user A cannot see user B's files)

## Success Criteria

- Pull returns all user files when no `since` param
- Pull returns only updated files when `since` provided
- Push upserts new files and updates existing ones
- Push deletes files by filename
- Unauthenticated requests get 401
- User A's push doesn't appear in User B's pull
- Response time < 100ms for 50 files

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Large collection JSON > 10MB | Low | Configurable body limit; collections rarely exceed 1MB |
| Concurrent push from multiple devices | Medium | Transaction isolation handles; LWW on client side |
| Drizzle onConflictDoUpdate on composite key | Low | Well-supported; tested in step 8 |

## Security Considerations

- All sync endpoints require valid JWT
- User can only access their own files (WHERE user_id = authenticated user)
- Input validation via Zod prevents malformed data
- Body size limit prevents DoS via large payloads
- No SQL injection risk — Drizzle uses parameterized queries

## Next Steps

Phase 04 — Deploy with PM2 + systemd + Nginx
