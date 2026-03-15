# Localman Backend

Hono + Better Auth + Drizzle ORM + PostgreSQL

## Prerequisites

- Node.js >= 20
- PostgreSQL running on localhost:5432
- Create DB user & database:
  ```sql
  CREATE USER localman WITH PASSWORD 'localman';
  CREATE DATABASE localman OWNER localman;
  ```
- Copy `.env.example` to `.env` and update values

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `pnpm dev` | `tsx watch` | Start dev server with hot-reload (auto-loads `.env`) |
| `pnpm build` | `tsc` | Compile TypeScript to `dist/` |
| `pnpm start` | `node dist/` | Run compiled app (auto-loads `.env`) |
| `pnpm start:prod` | `node dist/` | Same as `start` (production entry) |
| `pnpm db:generate` | `drizzle-kit generate` | Generate SQL migration files from schema changes |
| `pnpm db:migrate` | `drizzle-kit migrate` | Apply pending migrations to database |
| `pnpm db:push` | `drizzle-kit push` | Push schema directly to DB (dev only, no migration files) |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI at https://local.drizzle.studio |
| `pnpm auth:generate` | `@better-auth/cli` | Re-generate auth schema from Better Auth config |

## Typical Workflow

```bash
# 1. Install deps
pnpm install

# 2. Setup database (first time)
pnpm db:push          # push schema to DB directly
# OR
pnpm db:generate      # generate migration files
pnpm db:migrate       # apply migrations

# 3. Start dev server
pnpm dev              # http://localhost:3001

# 4. Build for production
pnpm build && pnpm start:prod
```

## Notes

- `db:push` is for dev — applies schema changes directly without migration files
- `db:migrate` is for prod — applies versioned migration files from `drizzle/` folder
- `db:generate` must run before `db:migrate` when schema changes
- `auth:generate` only needed when Better Auth config changes (interactive prompt)
- DB scripts require `DATABASE_URL` env var — export from `.env` or use: `export $(cat .env | grep -v '^#' | xargs) && pnpm db:generate`
