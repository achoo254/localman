# Phase 02: Database Schema

## Context Links
- [Plan overview](./plan.md)
- [Phase 01: Project Setup](./phase-01-project-setup.md)
- [Sync API design report](../reports/researcher-260308-1247-backend-sync-api-design.md)
- Client sync types: `src/types/sync.ts`
- Client sync service: `src/services/sync/sync-service.ts`

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Description:** Define Drizzle ORM schema for `users`, `refresh_tokens`, and `user_files` tables. Generate and apply migrations.

## Key Insights

**Critical design decision: `user_files` not normalized tables.**

The client sync uses a file-based model:
- Each collection is exported as Postman JSON and stored as a single file (`{collection_id}.json`)
- Server is a "dumb file store" — stores raw JSON text per user
- No need to parse/normalize collections, folders, or requests server-side
- This keeps Phase A simple; future phases can add normalized tables if needed

**Why NOT use the research report's `sync_events` / `entity_state` schema:**
- Over-engineered for Phase A where client does all reconciliation
- Client already implements LWW in `reconcile()` function
- Server just needs to store/retrieve JSON blobs per user

## Requirements

### Functional
- `users` table: id (UUID), email (unique), password_hash, timestamps
- `refresh_tokens` table: id, user_id (FK), token (unique), revoked flag, expires_at
- `user_files` table: id, user_id (FK), filename (unique per user), content (text), updated_at
- Composite unique constraint on `(user_id, filename)` in user_files
- Cascade delete: when user deleted, all tokens and files removed
- Drizzle migrations generated and applicable via `pnpm db:generate` / `pnpm db:push`

### Non-Functional
- Indexes on frequently queried columns
- UTC timestamps throughout
- UUIDs for primary keys (consistent with client)

## Architecture

### ER Diagram
```
users
  ├── id (UUID PK)
  ├── email (UNIQUE)
  ├── password_hash
  ├── created_at
  └── updated_at

refresh_tokens
  ├── id (UUID PK)
  ├── user_id (FK → users.id CASCADE)
  ├── token (UNIQUE)
  ├── revoked (BOOLEAN)
  ├── expires_at
  └── created_at

user_files
  ├── id (UUID PK)
  ├── user_id (FK → users.id CASCADE)
  ├── filename (TEXT)        -- e.g. "abc-123.json"
  ├── content (TEXT)         -- raw Postman JSON
  ├── updated_at
  └── created_at
  └── UNIQUE(user_id, filename)
```

### Data Flow
```
Client syncAll()
  → GET /api/sync/list          → SELECT filename, updated_at FROM user_files WHERE user_id = ?
  → PUT /api/sync/upload/:fn    → UPSERT user_files SET content = ?, updated_at = NOW()
  → GET /api/sync/download/:fn  → SELECT content FROM user_files WHERE user_id = ? AND filename = ?
  → DELETE /api/sync/delete/:fn → DELETE FROM user_files WHERE user_id = ? AND filename = ?
```

## Related Code Files

### Create
- `backend/src/db/schema.ts` — Drizzle table definitions
- `backend/src/db/client.ts` — Drizzle client + postgres connection
- `backend/src/db/redis.ts` — Redis (ioredis) client
- `backend/drizzle.config.ts` — Drizzle Kit config

### Modify
- `backend/src/server.ts` — register DB connection on startup, close on shutdown

## Implementation Steps

### Step 1: Create `backend/src/db/schema.ts`

```typescript
import { pgTable, text, timestamp, uuid, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userFiles = pgTable('user_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  filename: text('filename').notNull(),
  content: text('content').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_user_files_user_filename').on(table.userId, table.filename),
]);
```

### Step 2: Create `backend/src/db/client.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema.js';

const queryClient = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
export { queryClient };
```

### Step 3: Create `backend/src/db/redis.ts`

```typescript
import Redis from 'ioredis';
import { env } from '../env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});
```

### Step 4: Create `backend/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Step 5: Update `backend/src/server.ts`

Add DB and Redis connection lifecycle:

```typescript
// After plugin registration
import { queryClient } from './db/client.js';
import { redis } from './db/redis.js';

// In buildServer():
fastify.addHook('onClose', async () => {
  await queryClient.end();
  redis.disconnect();
});

// Connect Redis on startup
await redis.connect();
```

### Step 6: Generate migrations

```bash
cd backend
pnpm db:generate   # generates SQL in drizzle/ folder
```

### Step 7: Apply migrations

```bash
# Ensure PostgreSQL is running (via Docker from Phase 05, or local)
pnpm db:push       # applies schema directly to DB
```

### Step 8: Verify with Drizzle Studio

```bash
pnpm db:studio     # opens web UI at https://local.drizzle.studio
```

Verify tables exist: `users`, `refresh_tokens`, `user_files`.

## Todo List
- [ ] Create `src/db/schema.ts` with all 3 tables
- [ ] Create `src/db/client.ts` with Drizzle + postgres.js
- [ ] Create `src/db/redis.ts` with ioredis
- [ ] Create `drizzle.config.ts`
- [ ] Update `server.ts` with DB/Redis lifecycle hooks
- [ ] Generate migrations with `pnpm db:generate`
- [ ] Apply to local DB with `pnpm db:push`
- [ ] Verify tables in Drizzle Studio
- [ ] Run `tsc --noEmit` — no type errors

## Success Criteria
- All 3 tables created in PostgreSQL with correct columns, types, and constraints
- `UNIQUE(user_id, filename)` constraint on `user_files` verified
- Cascade delete works: deleting user removes their files and tokens
- Drizzle client connects and disconnects cleanly
- Redis client connects and disconnects cleanly

## Risk Assessment
| Risk | Mitigation |
|---|---|
| PostgreSQL not running locally | Use Docker from Phase 05, or install locally |
| `postgres` (npm) vs `pg` confusion | Using `postgres` (postgres.js) — lighter, ESM-native |
| Large JSON content in TEXT column | TEXT has no size limit in PostgreSQL; sufficient for Phase A |

## Security Considerations
- `password_hash` stored, never plain passwords
- `refresh_tokens.token` is unique + indexed for fast lookup
- Cascade delete ensures no orphaned data
- `DATABASE_URL` in env, never hardcoded
