# Code Reviewer Memory - Localman Backend

## Project Stack
- Hono + Drizzle ORM + PostgreSQL + Better Auth
- Zod for input validation
- TypeScript ESM (`"type": "module"`, `.js` extensions in imports)
- Build: `npx tsc --noEmit` for type check
- No test framework set up yet for backend

## Key Architecture
- Auth: Better Auth with session middleware (`auth-guard.ts`)
- RBAC: workspace-rbac.ts middleware reads `:workspaceId` param or `workspace_id` query
- Schemas: auth-schema.ts, schema.ts (userFiles), workspace-schema.ts, entity-schema.ts
- Soft delete pattern: `deletedAt` column, filter with `isNull(deletedAt)`
- Optimistic locking: `version` integer column incremented via `sql` template

## Known Patterns / Conventions
- Route files export a `Hono` router instance (e.g., `workspaceRouter`)
- Routes mounted under `/api` prefix in app.ts
- `AppVariables` type in `types/context.ts` for Hono context variables
- `c.get("user")!` pattern after `requireAuth` middleware

## Recurring Issues Found (2026-03-11)
- Entity routes using `:id` param confused with workspace ID in RBAC middleware -- fixed to `:workspaceId`
- FK constraints: `onDelete: "set null"` paired with `.notNull()` columns -- contradictory
- Missing ownership checks on entity CRUD (medium priority, not yet fixed)
- Sync push endpoint allows arbitrary field injection via `...change.data` spread
- CORS config missing PATCH method
