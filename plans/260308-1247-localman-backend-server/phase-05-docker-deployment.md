# Phase 05: Docker Deployment

## Context Links
- [Plan overview](./plan.md)
- [Phase 01: Project Setup](./phase-01-project-setup.md)
- [Sync API report — Docker section](../reports/researcher-260308-1247-backend-sync-api-design.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Description:** Create Dockerfile, docker-compose.yml, and environment config for local development with PostgreSQL 16, Redis 7, and the Fastify app.

## Key Insights
- Docker Compose for local dev only (not production deployment yet)
- Three services: postgres, redis, backend
- Health checks on all services so `depends_on` works correctly
- Volume mounts for hot reload in dev (backend source code)
- Named volumes for DB/Redis data persistence across restarts

## Requirements

### Functional
- `docker compose up` starts all 3 services
- PostgreSQL accessible on localhost:5432
- Redis accessible on localhost:6379
- Backend accessible on localhost:3000
- Drizzle migrations run automatically on backend startup (or via script)
- Hot reload: code changes in `backend/src/` reflect without restart

### Non-Functional
- Health checks with reasonable intervals
- Data persists across `docker compose down` / `up` (named volumes)
- `docker compose down -v` wipes all data (clean start)
- `.env` file for overriding defaults

## Architecture

```
docker-compose.yml (in backend/)
├── postgres (port 5432)
│     └── volume: pgdata
├── redis (port 6379)
│     └── volume: redisdata
└── backend (port 3000)
      ├── depends_on: postgres (healthy), redis (healthy)
      ├── volume mount: ./src → /app/src (hot reload)
      └── env: DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
```

## Related Code Files

### Create
- `backend/Dockerfile`
- `backend/Dockerfile.dev` (dev with hot reload)
- `backend/docker-compose.yml`
- `backend/.dockerignore`

### Modify
- `backend/src/main.ts` — optional: run migrations on startup
- `backend/package.json` — add `db:migrate` script

## Implementation Steps

### Step 1: Create `backend/.dockerignore`

```
node_modules
dist
.env
*.log
.git
```

### Step 2: Create `backend/Dockerfile` (production)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy source and build
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/dist ./dist
COPY --from=base /app/drizzle ./drizzle
COPY drizzle.config.ts ./

# Health check
RUN apk add --no-cache curl
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Step 3: Create `backend/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: localman-postgres
    environment:
      POSTGRES_DB: localman_dev
      POSTGRES_USER: localman
      POSTGRES_PASSWORD: localman
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U localman -d localman_dev"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: localman-redis
    command: redis-server --appendonly yes --requirepass localman_redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "localman_redis", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: localman-backend
    environment:
      NODE_ENV: development
      PORT: 3000
      HOST: 0.0.0.0
      DATABASE_URL: postgresql://localman:localman@postgres:5432/localman_dev
      REDIS_URL: redis://:localman_redis@redis:6379/0
      JWT_SECRET: dev-secret-change-in-production-at-least-32-chars
      JWT_EXPIRES_IN: 15m
      REFRESH_TOKEN_EXPIRES_IN: 7d
      CORS_ORIGIN: http://localhost:5173
      LOG_LEVEL: debug
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - /app/node_modules
    command: pnpm dev
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

### Step 4: Create startup migration script

Add to `backend/package.json`:
```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "start:dev": "pnpm db:push && pnpm dev"
  }
}
```

Update docker-compose backend command:
```yaml
command: sh -c "pnpm db:push && pnpm dev"
```

This auto-applies schema on every startup. Safe for dev; in production use versioned migrations.

### Step 5: Create `.env` defaults for local (non-Docker) development

Update `backend/.env.example` (already created in Phase 01):
```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Docker Compose defaults
DATABASE_URL=postgresql://localman:localman@localhost:5432/localman_dev
REDIS_URL=redis://:localman_redis@localhost:6379/0

JWT_SECRET=dev-secret-change-in-production-at-least-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

### Step 6: Add convenience scripts to `backend/package.json`

```json
{
  "scripts": {
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:clean": "docker compose down -v",
    "docker:logs": "docker compose logs -f backend",
    "docker:db-only": "docker compose up -d postgres redis"
  }
}
```

### Step 7: Document two dev workflows

**Workflow A: Full Docker (everything in containers)**
```bash
cd backend
pnpm docker:up
# All 3 services start. Backend hot-reloads via volume mount.
# Access: http://localhost:3000/api/health
```

**Workflow B: Docker for DB only, Node.js local (faster iteration)**
```bash
cd backend
pnpm docker:db-only          # Start postgres + redis only
cp .env.example .env         # Use localhost URLs
pnpm install
pnpm db:push                 # Apply schema
pnpm dev                     # Start Fastify locally
```

Workflow B is recommended for daily dev — faster restarts, better debugger support.

### Step 8: Verify

```bash
# Start everything
cd backend
docker compose up -d

# Check all healthy
docker compose ps
# Expect: 3 services, all "healthy"

# Test health endpoint
curl http://localhost:3000/api/health
# Expect: {"status":"ok","timestamp":"..."}

# Test DB connection (register a user)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"docker@test.com","password":"password123"}'
# Expect: 201 with accessToken

# Test Redis (logout to blacklist token)
TOKEN="..." # from register response
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
# Expect: {"success":true}

# Verify data persists across restart
docker compose down
docker compose up -d
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"docker@test.com","password":"password123"}'
# Expect: 200 with accessToken (user still exists)

# Clean start
docker compose down -v  # removes volumes
```

## Todo List
- [ ] Create .dockerignore
- [ ] Create Dockerfile (multi-stage production build)
- [ ] Create docker-compose.yml with postgres, redis, backend
- [ ] Add health checks to all services
- [ ] Add startup migration via `pnpm db:push` in docker command
- [ ] Add convenience scripts to package.json
- [ ] Test Workflow A: full Docker
- [ ] Test Workflow B: Docker DB only + local Node
- [ ] Verify data persistence across restarts
- [ ] Verify clean start with `docker compose down -v`
- [ ] Document both workflows in README

## Success Criteria
- `docker compose up -d` starts all 3 services to "healthy" state
- Health endpoint responds at localhost:3000
- Register/login works (PostgreSQL connected)
- Logout blacklists token (Redis connected)
- Code changes in `src/` reflect without container restart (hot reload)
- `docker compose down -v` wipes all data for clean start
- Both Workflow A and B documented and functional

## Risk Assessment
| Risk | Mitigation |
|---|---|
| Port conflicts (5432, 6379, 3000) | Configurable via .env or docker-compose override |
| Docker not installed | Document prerequisite; Workflow B works without Docker for backend |
| Volume mount performance on Windows | Use WSL2 backend for Docker Desktop |
| pnpm not in Docker image | Use `corepack enable` in Dockerfile |

## Security Considerations
- Default passwords are dev-only; document "change in production"
- `JWT_SECRET` in docker-compose is a dev default; production uses env injection
- Redis password set (not open by default)
- No ports exposed beyond localhost in dev
- `.env` file in `.gitignore` (no secrets committed)

## Next Steps (Post-Phase A)
- Production Dockerfile with proper multi-stage build
- CI/CD pipeline for backend (GitLab CI)
- Cloud deployment (Railway, Render, or VPS)
- TLS termination via reverse proxy (nginx/Caddy)
- Database backup strategy
