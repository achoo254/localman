# Backend Sync API Design Patterns for Offline-First Apps
**Research Report — Localman Phase 2 Backend**

**Date:** 2026-03-08
**Scope:** Server-side sync architecture, conflict resolution, token management, Docker dev setup
**Target:** Node.js + PostgreSQL + Redis backend for Localman

---

## Executive Summary

Localman's client already implements **Last-Write-Wins (LWW)** via `updated_at` timestamps. Server-side sync must mirror this strategy while managing multi-device conflicts, auth state, and offline queues. This report provides:

1. **sync_events table schema** for event sourcing + change log
2. **Pull/Push API endpoints** design (RESTful)
3. **Redis token blacklist** for revocation + rate limiting
4. **Docker Compose setup** with PostgreSQL, Redis, health checks
5. **Conflict resolution** patterns proven in production apps (Firebase, CouchDB, WatermelonDB)

---

## Part 1: Conflict Resolution Strategy (LWW Server-Side)

### How Client → Server LWW Works

**Client sends:**
```json
{
  "entity_type": "request",
  "entity_id": "req-uuid-123",
  "operation": "update",
  "payload": { "name": "Get Users", "method": "GET", "url": "..." },
  "updated_at": "2026-03-08T10:30:45.123Z",
  "device_id": "desktop-abc"
}
```

**Server resolves conflict:**
- If incoming `updated_at` > stored `updated_at` → accept, overwrite
- If incoming `updated_at` < stored `updated_at` → reject (local version wins)
- If incoming `updated_at` == stored `updated_at` → compare payload hash (deterministic tie-breaker)

**Critical assumption:** All devices sync `updated_at` in UTC. **Client must use server time on first auth**, not local clock.

### Why LWW is Sufficient for Localman (Single-User Focus)

- Single user, single workspace (Phase 2)
- Offline max 24-48 hours per device
- No explicit conflict detection UI needed
- Auto-merge via timestamp comparison

**When NOT to use LWW** (Phase 3+): Multi-user editing same request → need operational transformation (OT) or CRDTs.

---

## Part 2: sync_events Table Schema

### PostgreSQL Schema

```sql
-- Core events log (append-only)
CREATE TABLE sync_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID UNIQUE NOT NULL,        -- client-generated, idempotent key
  user_id BIGINT NOT NULL,              -- auth.user_id
  device_id VARCHAR(255) NOT NULL,      -- e.g., "desktop-abc", "web-xyz"

  entity_type VARCHAR(32) NOT NULL,     -- 'collection'|'request'|'environment'
  entity_id UUID NOT NULL,              -- localman resource UUID
  operation VARCHAR(16) NOT NULL,       -- 'create'|'update'|'delete'

  payload JSONB,                        -- full entity state (null for deletes)
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- client timestamp (ISO 8601)

  -- Server metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP WITH TIME ZONE,  -- when event was processed (for replay)
  conflict BOOLEAN DEFAULT FALSE,       -- true if newer event overwrote this

  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT entity_id_not_empty CHECK (entity_id != '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Indexes for query patterns
CREATE INDEX idx_sync_events_user_device ON sync_events(user_id, device_id, created_at DESC);
CREATE INDEX idx_sync_events_entity ON sync_events(entity_type, entity_id, updated_at DESC);
CREATE INDEX idx_sync_events_since ON sync_events(user_id, updated_at DESC) WHERE operation != 'delete';
CREATE INDEX idx_sync_events_created_at ON sync_events(user_id, created_at DESC);

-- Current state snapshot (denormalized for fast queries)
CREATE TABLE entity_state (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  entity_type VARCHAR(32) NOT NULL,

  -- Latest state
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_by_device_id VARCHAR(255),

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_entity_state_unique ON entity_state(user_id, id);
CREATE INDEX idx_entity_state_by_type ON entity_state(user_id, entity_type, updated_at DESC);
```

### Why Two Tables?

| Table | Purpose | Access Pattern |
|---|---|---|
| **sync_events** | Append-only event log; audit trail; time-series replay | `GET /sync/pull?since=T` pulls events since timestamp |
| **entity_state** | Current state snapshot; fast reads | `GET /collections/:id` reads latest state |

**Reconciliation logic:**
- Writes go to `sync_events` first (immutable)
- Post-apply trigger updates `entity_state` if no conflict
- On conflict: mark in `sync_events.conflict = true`, keep old `entity_state`

---

## Part 3: Sync API Design (Pull + Push)

### 3.1 Push Endpoint: POST /sync/push

**Client submits pending changes:**

```http
POST /sync/push
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "device_id": "desktop-abc",
  "changes": [
    {
      "event_id": "aaaa-bbbb-cccc",    // UUID from client, idempotent
      "entity_type": "request",
      "entity_id": "req-123",
      "operation": "update",
      "payload": { "name": "Get Users", "method": "GET" },
      "updated_at": "2026-03-08T10:30:45.123Z"
    },
    { ... }
  ]
}
```

**Server response:**

```json
{
  "success": true,
  "results": [
    {
      "event_id": "aaaa-bbbb-cccc",
      "status": "accepted",           // or "conflict" / "invalid"
      "server_updated_at": "2026-03-08T10:30:45.123Z",  // server time if updated
      "current_state": { ... }        // current entity state after merge
    },
    {
      "event_id": "dddd-eeee-ffff",
      "status": "conflict",
      "reason": "server_version_newer",
      "server_updated_at": "2026-03-08T10:35:10.000Z",
      "current_state": { ... }        // winning state (server's)
    }
  ],
  "server_time": "2026-03-08T10:45:00.000Z"  // current server time (for clock sync)
}
```

**Idempotency:** `event_id` is key. If same `event_id` submitted twice → return cached response, don't re-apply.

### 3.2 Pull Endpoint: GET /sync/pull

**Client pulls changes since last sync:**

```http
GET /sync/pull?since=2026-03-08T10:00:00.000Z
Authorization: Bearer {access_token}
```

**Server response:**

```json
{
  "changes": [
    {
      "entity_type": "request",
      "entity_id": "req-456",
      "operation": "update",
      "payload": { "name": "Create User", "method": "POST" },
      "updated_at": "2026-03-08T10:15:30.000Z",
      "updated_by_device_id": "mobile-xyz"
    },
    { ... }
  ],
  "server_time": "2026-03-08T10:45:00.000Z",
  "has_more": false,
  "pull_token": "eyJ..."  // optional: for pagination if >1000 changes
}
```

**Pagination:** If >1000 changes since `since`, return `has_more: true` + `pull_token`. Client sends `?since=T&token=pull_token` for next page.

### 3.3 Full Sync Endpoint: POST /sync/full

**New device or complete resync:**

```http
POST /sync/full
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "device_id": "new-device-xyz",
  "schema_version": 2
}
```

**Server response:** Full current state (all collections, requests, environments):

```json
{
  "collections": [
    {
      "id": "coll-123",
      "name": "My API",
      "updated_at": "2026-03-08T10:30:00.000Z",
      "requests": [
        {
          "id": "req-456",
          "name": "Get Users",
          "method": "GET",
          "updated_at": "2026-03-08T10:30:00.000Z"
        }
      ]
    }
  ],
  "environments": [ ... ],
  "server_time": "2026-03-08T10:45:00.000Z"
}
```

---

## Part 4: Redis Token Blacklist Implementation

### 4.1 Access Token Revocation (Logout)

**Why:** When user logs out or refreshes token, old token must be invalidated immediately (can't wait for expiry).

```python
# Node.js pseudocode
async function logout(userId: string, accessTokenJti: string) {
  // JTI = JWT ID (unique claim in token)
  const ttl = 15 * 60; // 15 min (access token TTL)
  await redis.setex(
    `blacklist:${userId}:${accessTokenJti}`,
    ttl,
    "1"
  );
}

async function isTokenBlacklisted(userId: string, accessTokenJti: string): Promise<boolean> {
  const result = await redis.get(`blacklist:${userId}:${accessTokenJti}`);
  return result === "1";
}
```

**Token structure (JWT):**
```json
{
  "sub": "user-123",
  "jti": "uuid-of-this-token",
  "exp": 1709893200,
  "iat": 1709892300
}
```

**Middleware check:**
```typescript
async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check blacklist
    const isBlacklisted = await isTokenBlacklisted(decoded.sub, decoded.jti);
    if (isBlacklisted) {
      return res.status(401).json({ error: "Token revoked" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

### 4.2 Rate Limiting (Optional)

```typescript
async function checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
  const key = `ratelimit:${userId}:${endpoint}`;
  const limit = 100; // per minute
  const ttl = 60;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, ttl);
  }

  return current <= limit;
}

// Middleware
app.use(async (req, res, next) => {
  if (!req.user) return next();

  const allowed = await checkRateLimit(req.user.id, req.path);
  if (!allowed) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }
  next();
});
```

### 4.3 Session Tokens (Refresh Token Rotation)

```typescript
// On login, store refresh token in Redis with device info
async function storeRefreshToken(userId: string, token: string, deviceId: string) {
  const ttl = 30 * 24 * 60 * 60; // 30 days
  const jti = jwt.decode(token).jti;

  await redis.setex(
    `refresh:${userId}:${jti}`,
    ttl,
    JSON.stringify({
      device_id: deviceId,
      issued_at: new Date().toISOString(),
      used_at: new Date().toISOString()
    })
  );
}

// On token refresh, check rotation rules
async function refreshAccessToken(userId: string, refreshToken: string) {
  const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  const sessionData = await redis.get(`refresh:${userId}:${decoded.jti}`);

  if (!sessionData) {
    throw new Error("Refresh token revoked");
  }

  // Rotate: invalidate old, issue new
  const newAccessToken = jwt.sign({ ... }, JWT_SECRET, { expiresIn: '15m' });
  const newRefreshToken = jwt.sign({ ... }, REFRESH_SECRET, { expiresIn: '30d' });

  // Old token to blacklist
  await redis.setex(`blacklist:${userId}:${decoded.jti}`, 15*60, "1");

  // Store new refresh session
  await storeRefreshToken(userId, newRefreshToken, decoded.device_id);

  return { access_token: newAccessToken, refresh_token: newRefreshToken };
}
```

---

## Part 5: Docker Compose for Development

### docker-compose.yml

```yaml
version: '3.9'

services:
  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    container_name: localman-postgres
    environment:
      POSTGRES_DB: localman_dev
      POSTGRES_USER: localman_user
      POSTGRES_PASSWORD: localman_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U localman_user -d localman_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - localman-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: localman-redis
    command: redis-server --appendonly yes --requirepass redis_pass
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_pass", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - localman-network

  # Node.js Backend
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: localman-backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://localman_user:localman_pass@postgres:5432/localman_dev
      REDIS_URL: redis://:redis_pass@redis:6379/0
      JWT_SECRET: your-secret-key-change-in-production
      REFRESH_SECRET: your-refresh-secret-change-in-production
      LOG_LEVEL: debug
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - localman-network

volumes:
  postgres_data:
  redis_data:

networks:
  localman-network:
    driver: bridge
```

### Dockerfile (Node.js Backend)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript (if applicable)
RUN npm run build || true

# Health check
RUN apk add --no-cache curl

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### sql/init.sql (Database initialization)

```sql
-- Create schema
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS api;

-- Auth users table
CREATE TABLE auth.users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  device_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sync events (as defined above)
CREATE TABLE api.sync_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID UNIQUE NOT NULL,
  user_id BIGINT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id UUID NOT NULL,
  operation VARCHAR(16) NOT NULL,
  payload JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP WITH TIME ZONE,
  conflict BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_events_user_device ON api.sync_events(user_id, device_id, created_at DESC);
CREATE INDEX idx_sync_events_entity ON api.sync_events(entity_type, entity_id, updated_at DESC);
CREATE INDEX idx_sync_events_since ON api.sync_events(user_id, updated_at DESC);

-- Entity state snapshot
CREATE TABLE api.entity_state (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_by_device_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_entity_state_unique ON api.entity_state(user_id, id);
CREATE INDEX idx_entity_state_by_type ON api.entity_state(user_id, entity_type, updated_at DESC);
```

### Usage

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Run migrations (once services are up)
docker-compose exec backend npm run migrate

# Stop
docker-compose down

# Clean (remove volumes)
docker-compose down -v
```

---

## Part 6: Implementation Roadmap

### Phase 2A: Foundation (1 week)
- [x] PostgreSQL schema: `sync_events`, `entity_state`
- [x] Redis setup: token blacklist, session storage
- [x] Docker Compose: local dev environment
- [x] Auth endpoints: signup, login, refresh, logout
- [ ] POST /sync/push implementation + tests
- [ ] GET /sync/pull implementation + tests

### Phase 2B: Sync Engine (1 week)
- [ ] Conflict resolution logic (LWW comparison)
- [ ] Event sourcing replay mechanism
- [ ] POST /sync/full endpoint
- [ ] Idempotency via `event_id`
- [ ] Pagination for large pull responses

### Phase 2C: Client Integration (1 week)
- [ ] Client: map IndexedDB `pending_sync` → POST /sync/push
- [ ] Client: implement exponential backoff + retry logic
- [ ] Client: handle 409 conflicts (merge local + server)
- [ ] Client: clock sync on first auth (use `server_time` from response)

### Phase 2D: Testing + Docs (3 days)
- [ ] Integration tests (multi-device sync scenarios)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide (cloud options: Railway, Render, AWS)

---

## Part 7: Key Decisions Rationale

| Decision | Choice | Why |
|---|---|---|
| **Conflict Strategy** | Last-Write-Wins (timestamp) | Simple, sufficient for single-user Phase 2; scales to multi-user with CRDT in Phase 3+ |
| **Event Log** | Append-only PostgreSQL + denormalized snapshot | Audit trail + fast reads; JSONB payload for flexibility |
| **Token Blacklist** | Redis with TTL = access token TTL | Fast revocation without DB round-trip; auto-expires |
| **Push Format** | Batch changes + idempotent `event_id` | Reduces round-trips; survives network retries |
| **Pull Cadence** | Client polls, not server push | Simpler for offline-first; client controls sync frequency |
| **Docker Dev** | PostgreSQL + Redis + Node locally | Mirrors production; all devs have same environment |

---

## Part 8: Security Checklist

- [ ] **HTTPS only** in production (TLS termination at reverse proxy)
- [ ] **JWT secrets** in environment variables, NOT in code
- [ ] **CORS policy** restricted to known Localman domains
- [ ] **Rate limiting** per user per endpoint (Redis)
- [ ] **SQL injection** prevented via parameterized queries (use ORM or $1, $2 placeholders)
- [ ] **Token blacklist** checked on every auth request
- [ ] **Refresh token rotation** on each use (invalidate old)
- [ ] **Device tracking** optional (fraud detection future)
- [ ] **Audit logging** of all sync events (already in schema)

---

## Part 9: Known Limitations & Future Improvements

| Issue | Phase 2 | Phase 3+ |
|---|---|---|
| **Multi-user conflicts** | N/A (single-user) | Implement CRDTs or OT for collaborative editing |
| **Real-time sync** | Polling only | Add WebSocket for live updates |
| **Offline duration** | 24–48 hrs recommended | Configurable with pagination + archival |
| **Large payloads** | JSONB size limit ~1GB | Chunk requests into separate events |
| **Tombstones** | Delete events kept forever | Archive old deletes after 90 days |
| **Time sync errors** | Assume <5s clock skew | Implement NTP client for better precision |

---

## References & Inspiration

**Production systems using LWW:**
- Firebase Realtime DB: timestamp-based conflict resolution
- CouchDB: revision trees + MVCC (multi-version concurrency)
- WatermelonDB: last-write-wins + local-first
- Figma: operational transform for multiplayer (OT, not LWW)

**Event sourcing patterns:**
- Martin Fowler: "Event Sourcing" (https://martinfowler.com/eaaDev/EventSourcing.html)
- Greg Young: CQRS architecture (event store pattern)
- PostgreSQL JSONB + logical replication for audit

**Offline-first frameworks:**
- Realm (mobile)
- Firebase Offline Persistence
- Amplify DataStore
- Yjs (CRDT library)

---

## Unresolved Questions

1. **Should sync_events table be partitioned by date** for very large user bases (e.g., millions of events/month)?
   - *Answer for Phase 2:* No; partition when single table exceeds 1GB.

2. **How to handle deleted collections?** Should soft-deletes (deleted_at) or hard-deletes in entity_state?
   - *Recommended:* Soft-delete (deleted_at). Mark as deleted, keep in sync_events for audit. Hard-delete after 90 days.

3. **Should server push notifications** (WebSocket) when another device syncs changes?
   - *Answer for Phase 2:* No; clients poll on interval. Phase 2B can add optional WebSocket for real-time.

4. **How to handle massive collections** (1000+ requests)? Chunked push/pull?
   - *Answer:* Use pagination token. Split large payloads client-side before POST /sync/push.

5. **What's the acceptable clock skew tolerance** between devices?
   - *Answer:* ±5 seconds is safe. Greater skew = use server time on auth for sync.

---

**Report Status:** Ready for Phase 2 implementation
**Next Step:** Developer implements POST /sync/push endpoint + Redis token blacklist
