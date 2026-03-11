# Phase 1: Backend Entity-Level Storage + Workspace RBAC

## Context

- [Brainstorm report](../reports/brainstorm-260310-2204-cloud-sync-team-architecture.md)
- [Current schema](../../backend/src/db/schema.ts) — `userFiles` blob table
- [Current sync routes](../../backend/src/routes/sync.ts) — pull/push blob endpoints
- [Auth schema](../../backend/src/db/auth-schema.ts) — Better Auth tables

## Overview

- **Priority:** P1 (foundation for all other phases)
- **Status:** Complete
- **Effort:** 20h
- **Description:** Replace `userFiles` blob table with normalized entity tables. Add workspace + RBAC system. New REST API for CRUD operations.

## Key Insights

- Current `userFiles` stores entire collection as single JSON blob — no way to share individual requests or merge fields
- Need atomic entity-level storage: each request, folder, environment = separate row
- Workspace model required for team sharing; personal collections have `workspace_id = null`
- Soft delete (`deleted_at`) needed for sync propagation to other clients
- Version counter per entity for optimistic locking (Phase 4 will use this)

## Requirements

### Functional
- F1: Workspace CRUD (create, read, update, delete)
- F2: Workspace member management (invite, remove, change role)
- F3: Entity CRUD via REST API (collections, folders, requests, environments)
- F4: Personal collections support (`workspace_id = null`, `user_id` = owner)
- F5: `is_synced` toggle per collection/environment for personal items
- F6: Data migration script: `userFiles` blob → normalized tables

### Non-Functional
- NF1: All queries workspace-scoped or user-scoped (no cross-tenant leaks)
- NF2: Optimistic locking via `version` counter on all entities
- NF3: Soft delete with `deleted_at` timestamp
- NF4: Transactional writes for multi-entity operations

## Architecture

### New Database Schema (Drizzle)

```sql
-- Workspaces
workspaces(
  id uuid PK default random,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  owner_id text NOT NULL FK→user(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Workspace Members
workspace_members(
  id uuid PK default random,
  workspace_id uuid NOT NULL FK→workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL FK→user(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL DEFAULT 'editor', -- 'owner' | 'editor' | 'viewer'
  joined_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
)

-- Workspace Invites
workspace_invites(
  id uuid PK default random,
  workspace_id uuid NOT NULL FK→workspaces(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'editor',
  token varchar(64) NOT NULL UNIQUE,
  invited_by text NOT NULL FK→user(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz NULL,
  created_at timestamptz DEFAULT now()
)

-- Collections (normalized)
collections(
  id uuid PK default random,
  workspace_id uuid NULL FK→workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL FK→user(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_synced boolean DEFAULT false, -- for personal collections
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NULL
)
INDEX: (workspace_id), (user_id), (workspace_id, deleted_at)

-- Folders
folders(
  id uuid PK default random,
  collection_id uuid NOT NULL FK→collections(id) ON DELETE CASCADE,
  parent_id uuid NULL FK→folders(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  sort_order integer DEFAULT 0,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NULL
)
INDEX: (collection_id), (collection_id, parent_id)

-- Requests
requests(
  id uuid PK default random,
  collection_id uuid NOT NULL FK→collections(id) ON DELETE CASCADE,
  folder_id uuid NULL FK→folders(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  method varchar(10) NOT NULL DEFAULT 'GET',
  url text DEFAULT '',
  params jsonb DEFAULT '[]',
  headers jsonb DEFAULT '[]',
  body jsonb DEFAULT '{}',
  auth jsonb DEFAULT '{}',
  description text,
  pre_script text,
  post_script text,
  sort_order integer DEFAULT 0,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NULL
)
INDEX: (collection_id), (collection_id, folder_id)

-- Environments
environments(
  id uuid PK default random,
  workspace_id uuid NULL FK→workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL FK→user(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT false,
  is_synced boolean DEFAULT false,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NULL
)
INDEX: (workspace_id), (user_id)

-- Change Log (for delta sync + merge in Phase 4)
change_log(
  id uuid PK default random,
  entity_type varchar(20) NOT NULL, -- 'collection' | 'folder' | 'request' | 'environment'
  entity_id uuid NOT NULL,
  workspace_id uuid NULL,
  user_id text NOT NULL FK→user(id),
  field_changes jsonb NOT NULL, -- { field: { old: X, new: Y } }
  from_version integer NOT NULL,
  to_version integer NOT NULL,
  created_at timestamptz DEFAULT now()
)
INDEX: (entity_type, entity_id, from_version), (workspace_id, created_at)
```

### REST API Routes

```
# Workspaces
GET    /api/workspaces                    — list user's workspaces
POST   /api/workspaces                    — create workspace
GET    /api/workspaces/:id                — get workspace details + members
PATCH  /api/workspaces/:id                — update workspace
DELETE /api/workspaces/:id                — delete workspace (owner only)

# Workspace Members
POST   /api/workspaces/:id/invite         — send invite email
POST   /api/workspaces/:id/join/:token    — accept invite
DELETE /api/workspaces/:id/members/:uid   — remove member
PATCH  /api/workspaces/:id/members/:uid   — change role

# Collections (workspace or personal)
GET    /api/collections?workspace_id=X    — list collections in workspace
GET    /api/collections?personal=true     — list personal synced collections
POST   /api/collections                   — create collection
GET    /api/collections/:id               — get collection with folders + requests
PATCH  /api/collections/:id               — update collection fields
DELETE /api/collections/:id               — soft delete

# Folders
POST   /api/collections/:cid/folders      — create folder
PATCH  /api/folders/:id                   — update folder
DELETE /api/folders/:id                   — soft delete

# Requests
POST   /api/collections/:cid/requests     — create request
GET    /api/requests/:id                  — get single request
PATCH  /api/requests/:id                  — update request fields
DELETE /api/requests/:id                  — soft delete

# Environments (workspace or personal)
GET    /api/environments?workspace_id=X   — list environments
POST   /api/environments                  — create environment
PATCH  /api/environments/:id              — update environment
DELETE /api/environments/:id              — soft delete

# Sync (entity-level, replaces old blob sync)
GET    /api/sync/changes?since=ISO&workspace_id=X  — get changes since timestamp
POST   /api/sync/push                              — push batch of entity changes
```

### RBAC Middleware

```typescript
// Workspace role check
type WorkspaceRole = 'owner' | 'editor' | 'viewer';

// requireWorkspaceRole('editor') → checks user is at least editor
// Role hierarchy: owner > editor > viewer
// Owner can do everything; editor can CRUD entities; viewer read-only

function requireWorkspaceRole(minRole: WorkspaceRole) {
  return async (c, next) => {
    const user = c.get('user');
    const workspaceId = c.req.param('id') || c.req.query('workspace_id');
    if (!workspaceId) return next(); // personal collection, check user_id
    const member = await db.query... // check membership
    if (!member || roleLevel(member.role) < roleLevel(minRole))
      return c.json({ error: 'Forbidden' }, 403);
    c.set('workspaceRole', member.role);
    return next();
  };
}
```

## Related Code Files

### Files to Create
- `backend/src/db/workspace-schema.ts` — workspace, workspace_members, workspace_invites tables
- `backend/src/db/entity-schema.ts` — collections, folders, requests, environments, change_log tables
- `backend/src/routes/workspace-routes.ts` — workspace CRUD + member management
- `backend/src/routes/collection-routes.ts` — collection/folder/request CRUD
- `backend/src/routes/environment-routes.ts` — environment CRUD
- `backend/src/routes/entity-sync-routes.ts` — entity-level sync endpoints
- `backend/src/middleware/workspace-rbac.ts` — workspace role checking middleware
- `backend/src/services/workspace-service.ts` — workspace business logic
- `backend/src/services/invite-service.ts` — invite link token generation + validation (no email)
- `backend/src/scripts/migrate-user-files.ts` — manual migration script (run once via `pnpm db:migrate-data`)
- `backend/drizzle/0001_team_workspace.sql` — migration

### Files to Modify
- `backend/src/app.ts` — mount new routes
- `backend/src/db/client.ts` — include new schemas
- `backend/src/env.ts` — add INVITE_TOKEN_SECRET env var

### Files to Delete (after migration verified)
- `backend/src/db/schema.ts` → remove `userFiles` table definition (keep auth re-exports)
- `backend/src/routes/sync.ts` → replaced by `entity-sync-routes.ts`

## Implementation Steps

1. **Create workspace schema** (`workspace-schema.ts`)
   - Define `workspaces`, `workspace_members`, `workspace_invites` tables
   - Export all tables with proper FK references

2. **Create entity schema** (`entity-schema.ts`)
   - Define `collections`, `folders`, `requests`, `environments`, `change_log` tables
   - All with `version`, `deleted_at`, proper indexes

3. **Generate Drizzle migration**
   - Run `pnpm db:generate` → creates SQL migration
   - Review migration, ensure no destructive changes to existing tables
   - Run `pnpm db:migrate`

4. **Implement RBAC middleware** (`workspace-rbac.ts`)
   - `requireWorkspaceRole(minRole)` — checks workspace membership + role
   - `requireEntityOwnership()` — for personal collections, verify user_id

5. **Implement workspace routes** (`workspace-routes.ts`)
   - CRUD workspace
   - Member management (invite, accept, remove, change role)
   - Owner-only operations: delete workspace, transfer ownership

6. **Implement collection routes** (`collection-routes.ts`)
   - CRUD collections, folders, requests
   - Workspace-scoped or personal-scoped queries
   - Soft delete (set `deleted_at` instead of hard delete)
   - Auto-increment `version` on every update

7. **Implement environment routes** (`environment-routes.ts`)
   - CRUD environments
   - Workspace-scoped or personal-scoped

8. **Implement entity sync routes** (`entity-sync-routes.ts`)
   - `GET /api/sync/changes` — returns entities changed since timestamp
   - `POST /api/sync/push` — batch upsert with version checking
   - Write to `change_log` on every entity mutation

9. **Write migration script** for existing `userFiles` data
   - Parse blob JSON → extract collections, folders, requests
   - Insert into normalized tables with `user_id` as owner, `workspace_id = null`

10. **Mount routes in app.ts**
    - Add new route groups with proper middleware chain

11. **Update `backend/src/db/client.ts`**
    - Import and spread new schemas

## Todo List

- [x] Create `workspace-schema.ts` with workspace tables
- [x] Create `entity-schema.ts` with entity tables + change_log
- [x] Generate and run Drizzle migration
- [x] Implement `workspace-rbac.ts` middleware
- [x] Implement `workspace-service.ts` business logic
- [x] Implement `invite-service.ts` token handling
- [x] Implement `workspace-routes.ts` (CRUD + members)
- [x] Implement `collection-routes.ts` (collections, folders, requests)
- [x] Implement `environment-routes.ts`
- [x] Implement `entity-sync-routes.ts` (delta sync)
- [x] Write `userFiles` → entities migration script
- [x] Mount all routes in `app.ts`
- [x] Update `db/client.ts` with new schemas
- [x] Add Zod validation schemas for all request bodies
- [x] Write unit tests for RBAC middleware
- [x] Write integration tests for workspace + entity CRUD
- [x] Test migration script with existing data

## Success Criteria

- All new tables created with proper indexes and FKs
- Workspace CRUD works with role-based access
- Entity CRUD returns proper responses with version tracking
- `change_log` populated on every entity mutation
- Migration script converts existing blob data without loss
- All existing auth functionality preserved
- API responds with proper 403 for unauthorized workspace access

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Migration data loss | High | Keep `userFiles` table as backup, run migration on copy first |
| FK cascade issues | Medium | Test delete cascades carefully, use soft delete primarily |
| Schema too complex | Medium | Start with core tables only, add change_log in Phase 4 if needed |
| N+1 queries | Medium | Use Drizzle joins for collection→folders→requests fetching |

## Security Considerations

- All queries must be scoped by workspace membership OR user ownership
- Invite tokens: cryptographically random, 24h expiry, single-use
- Role escalation prevention: only owner can promote to owner
- Rate limit workspace creation (prevent abuse)
- Validate `workspace_id` in request body matches route param

## Next Steps

- Phase 2 depends on this: client sync engine will use new entity APIs
- Phase 3 WebSocket will broadcast change_log events
- Phase 4 merge engine will use version counters from this phase
