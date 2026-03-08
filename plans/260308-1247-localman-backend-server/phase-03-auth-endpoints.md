# Phase 03: Auth Endpoints

## Context Links
- [Plan overview](./plan.md)
- [Phase 02: Database Schema](./phase-02-database-schema.md)
- [Fastify patterns report](../reports/researcher-260308-1246-fastify-typescript-backend-patterns.md)
- [Sync API report — Redis token blacklist](../reports/researcher-260308-1247-backend-sync-api-design.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 4h
- **Description:** Implement register, login, logout, and refresh endpoints with JWT access tokens and httpOnly refresh cookies. Redis blacklist for logout.

## Key Insights
- Access token: 15min, returned in JSON response body, client stores in memory (Zustand)
- Refresh token: 7d, stored in DB (`refresh_tokens` table), sent as httpOnly cookie
- On logout: blacklist access token JTI in Redis (TTL = remaining token lifetime)
- On refresh: verify refresh token in DB, issue new access token
- Password hashing: bcryptjs (10 rounds)
- JWT payload: `{ sub: userId, email, jti: uuid }`

## Requirements

### Functional
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | None | Create user, return access token + set refresh cookie |
| `/api/auth/login` | POST | None | Verify credentials, return access token + set refresh cookie |
| `/api/auth/logout` | POST | Bearer | Blacklist current access token in Redis, revoke refresh token in DB |
| `/api/auth/refresh` | POST | Cookie | Verify refresh cookie, return new access token |

### Request/Response Schemas

**POST /api/auth/register**
```
Request:  { email: string, password: string (min 8) }
Response: { id: string, email: string, accessToken: string }
Cookie:   refreshToken (httpOnly, secure in prod, sameSite: lax, maxAge: 7d)
Errors:   400 (validation), 409 (email exists)
```

**POST /api/auth/login**
```
Request:  { email: string, password: string }
Response: { id: string, email: string, accessToken: string }
Cookie:   refreshToken (same as register)
Errors:   401 (invalid credentials)
```

**POST /api/auth/logout**
```
Headers:  Authorization: Bearer {accessToken}
Response: { success: true }
Side effects: Redis SET blacklist:{jti} with TTL, DB revoke refresh token
```

**POST /api/auth/refresh**
```
Cookie:   refreshToken (auto-sent)
Response: { accessToken: string }
Errors:   401 (missing/invalid/expired/revoked refresh token)
```

### Non-Functional
- Bcrypt cost factor: 10 (balance speed/security)
- Rate limit auth endpoints: 10 req / minute per IP (stricter than global)
- Generic error messages on login failure (don't reveal if email exists)

## Architecture

### Auth Flow Diagram
```
Register/Login:
  Client → POST /api/auth/register or /login
    → Server validates input
    → Server hashes password (register) or verifies (login)
    → Server creates JWT access token (15min, with jti)
    → Server creates refresh token (random UUID), stores in DB
    → Server sets refresh token as httpOnly cookie
    → Returns { id, email, accessToken }

Protected Request:
  Client → GET /api/sync/list (Authorization: Bearer {token})
    → Server verifies JWT signature + expiry
    → Server checks Redis blacklist for jti
    → If valid → proceed
    → If invalid/blacklisted → 401

Refresh:
  Client → POST /api/auth/refresh (cookie auto-sent)
    → Server reads refreshToken from cookie
    → Server looks up in DB: valid + not revoked + not expired
    → Server issues new access token
    → Returns { accessToken }

Logout:
  Client → POST /api/auth/logout (Bearer token)
    → Server decodes JWT, extracts jti
    → Server adds jti to Redis blacklist (TTL = remaining token life)
    → Server revokes refresh token in DB
    → Returns { success: true }
```

## Related Code Files

### Create
- `backend/src/services/auth-service.ts` — password hashing, token generation
- `backend/src/routes/auth/register.ts`
- `backend/src/routes/auth/login.ts`
- `backend/src/routes/auth/logout.ts`
- `backend/src/routes/auth/refresh.ts`
- `backend/src/plugins/jwt.ts` — @fastify/jwt setup + verifyAuth decorator
- `backend/src/middleware/auth-guard.ts` — preHandler hook for protected routes

### Modify
- `backend/src/server.ts` — register JWT plugin + auth routes

## Implementation Steps

### Step 1: Create JWT plugin — `src/plugins/jwt.ts`

```typescript
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../env.js';
import { redis } from '../db/redis.js';

export default fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // Decorator: verify JWT + check Redis blacklist
  fastify.decorate('verifyAuth', async function (request, reply) {
    try {
      const payload = await request.jwtVerify();
      // Check blacklist
      if (payload.jti) {
        const blacklisted = await redis.get(`blacklist:${payload.jti}`);
        if (blacklisted) {
          return reply.code(401).send({ error: 'Token revoked', code: 'TOKEN_REVOKED' });
        }
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
  });
});
```

### Step 2: Create auth service — `src/services/auth-service.ts`

```typescript
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRefreshToken(): string {
  return crypto.randomUUID();
}
```

### Step 3: Create register route — `src/routes/auth/register.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { users, refreshTokens } from '../../db/schema.js';
import { hashPassword, generateRefreshToken } from '../../services/auth-service.js';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

const schema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
  },
};

export default async function registerRoute(fastify: FastifyInstance) {
  fastify.post('/register', { schema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    // Check existing
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({ error: 'Email already registered', code: 'CONFLICT' });
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
    }).returning({ id: users.id, email: users.email });

    // Generate tokens
    const jti = crypto.randomUUID();
    const accessToken = fastify.jwt.sign(
      { sub: user.id, email: user.email, jti }
    );

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    // Set refresh cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return reply.code(201).send({
      id: user.id,
      email: user.email,
      accessToken,
    });
  });
}
```

### Step 4: Create login route — `src/routes/auth/login.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { users, refreshTokens } from '../../db/schema.js';
import { verifyPassword, generateRefreshToken } from '../../services/auth-service.js';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

const schema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 1 },
    },
  },
};

export default async function loginRoute(fastify: FastifyInstance) {
  fastify.post('/login', { schema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    // Generate tokens
    const jti = crypto.randomUUID();
    const accessToken = fastify.jwt.sign({ sub: user.id, email: user.email, jti });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({
      id: user.id,
      email: user.email,
      accessToken,
    });
  });
}
```

### Step 5: Create logout route — `src/routes/auth/logout.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { refreshTokens } from '../../db/schema.js';
import { redis } from '../../db/redis.js';
import { eq, and } from 'drizzle-orm';

export default async function logoutRoute(fastify: FastifyInstance) {
  fastify.post('/logout', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const payload = request.user as { sub: string; jti?: string; exp?: number };

    // Blacklist access token in Redis
    if (payload.jti && payload.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`blacklist:${payload.jti}`, ttl, '1');
      }
    }

    // Revoke refresh token from cookie
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(and(
          eq(refreshTokens.userId, payload.sub),
          eq(refreshTokens.token, refreshToken)
        ));
    }

    reply.clearCookie('refreshToken', { path: '/api/auth' });
    return reply.send({ success: true });
  });
}
```

### Step 6: Create refresh route — `src/routes/auth/refresh.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { refreshTokens, users } from '../../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'node:crypto';

export default async function refreshRoute(fastify: FastifyInstance) {
  fastify.post('/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken;

    if (!token) {
      return reply.code(401).send({ error: 'Refresh token missing', code: 'UNAUTHORIZED' });
    }

    // Look up valid, non-revoked, non-expired token
    const [record] = await db.select({
      userId: refreshTokens.userId,
      email: users.email,
    })
      .from(refreshTokens)
      .innerJoin(users, eq(users.id, refreshTokens.userId))
      .where(and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!record) {
      reply.clearCookie('refreshToken', { path: '/api/auth' });
      return reply.code(401).send({ error: 'Invalid refresh token', code: 'UNAUTHORIZED' });
    }

    // Issue new access token
    const jti = crypto.randomUUID();
    const accessToken = fastify.jwt.sign({
      sub: record.userId,
      email: record.email,
      jti,
    });

    return reply.send({ accessToken });
  });
}
```

### Step 7: Register auth routes in `src/server.ts`

```typescript
// Add after health route registration
await fastify.register(import('./routes/auth/register.js'), { prefix: '/api/auth' });
await fastify.register(import('./routes/auth/login.js'), { prefix: '/api/auth' });
await fastify.register(import('./routes/auth/logout.js'), { prefix: '/api/auth' });
await fastify.register(import('./routes/auth/refresh.js'), { prefix: '/api/auth' });
```

### Step 8: Add Fastify type augmentation — `src/types/fastify.d.ts`

```typescript
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    verifyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; jti: string };
    user: { sub: string; email: string; jti: string };
  }
}
```

### Step 9: Add stricter rate limit for auth routes

In `src/plugins/rate-limit.ts`, configure auth-specific limits:
```typescript
// Global: 100 / 15 min
// Auth routes get overridden per-route or via route-level config
// In register/login routes, add:
//   { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }
```

### Step 10: Verify all endpoints

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' -v

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt -v

# Refresh (using cookie)
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt -v

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {token}" \
  -b cookies.txt -v
```

## Todo List
- [ ] Create JWT plugin with verifyAuth decorator
- [ ] Create auth-service.ts (hash, verify, generateRefreshToken)
- [ ] Create register route
- [ ] Create login route
- [ ] Create logout route with Redis blacklist
- [ ] Create refresh route
- [ ] Add Fastify type augmentations
- [ ] Register all auth routes in server.ts
- [ ] Add stricter rate limit for auth endpoints
- [ ] Test register → login → refresh → logout flow manually
- [ ] Run `tsc --noEmit`

## Success Criteria
- Register creates user in DB, returns accessToken, sets refreshToken cookie
- Login with correct password returns tokens; wrong password returns 401
- Refresh with valid cookie returns new accessToken
- Logout blacklists token in Redis; subsequent requests with that token get 401
- Duplicate email registration returns 409
- Invalid/expired refresh token returns 401 and clears cookie

## Risk Assessment
| Risk | Mitigation |
|---|---|
| Clock skew between server/client | JWT uses server time only; client gets token from server |
| Refresh token leak | httpOnly + secure cookie; scoped to `/api/auth` path |
| Redis down → blacklist fails | Fail open (allow) in dev; fail closed (deny) in prod; add Redis health check |
| Bcrypt timing attacks | bcrypt.compare is constant-time by design |

## Security Considerations
- Passwords hashed with bcrypt (10 rounds), never stored plain
- Access tokens include `jti` for individual revocation
- Refresh tokens scoped to `/api/auth` path only (not sent with sync requests)
- httpOnly cookie prevents XSS access to refresh token
- Generic "Invalid credentials" message on login failure (no email enumeration)
- Rate limiting on auth endpoints prevents brute force
- Redis blacklist TTL matches token expiry (auto-cleanup)
