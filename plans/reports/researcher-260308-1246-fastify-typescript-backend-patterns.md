# Fastify + TypeScript Backend Research Report
**Date:** 2026-03-08 | **Project:** Localman (Phase 2 Cloud Sync)

---

## Executive Summary

Fastify is a high-performance Node.js web framework ideal for Localman's Phase 2 backend. It offers:
- **Sub-1ms latency** routing & schema validation via JSON Schema
- **First-class TypeScript support** with type-safe plugins
- **Built-in security plugins** (@fastify/jwt, @fastify/rate-limit, @fastify/helmet)
- **Ecosystem maturity** for multi-user SaaS (auth, DB, migrations)

**Recommendation:** Use **Fastify + Drizzle ORM** (not Prisma) for flexibility with PostgreSQL migrations. Drizzle integrates seamlessly with Fastify and provides better control over schema versioning for a sync-heavy system like Localman.

---

## 1. Fastify Folder Structure (TypeScript)

```
backend/
├── src/
│   ├── main.ts                      # App entry point
│   ├── server.ts                    # Fastify instance & plugin registration
│   ├── env.ts                       # Environment validation (Zod)
│   │
│   ├── plugins/                     # Fastify plugins (auto-loaded)
│   │   ├── auth.ts                  # @fastify/jwt setup
│   │   ├── postgres.ts              # Database plugin (Drizzle)
│   │   ├── rate-limit.ts            # @fastify/rate-limit setup
│   │   ├── cors.ts                  # @fastify/cors setup
│   │   └── helmet.ts                # Security headers
│   │
│   ├── routes/                      # Route handlers (auto-loaded)
│   │   ├── auth/
│   │   │   ├── register.ts
│   │   │   ├── login.ts
│   │   │   └── refresh.ts
│   │   ├── collections/
│   │   │   ├── index.ts             # List collections
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   └── delete.ts
│   │   ├── requests/
│   │   │   ├── index.ts
│   │   │   ├── create.ts
│   │   │   └── execute.ts           # Execute API request
│   │   ├── environments/
│   │   │   └── index.ts
│   │   └── health.ts                # Health check
│   │
│   ├── schemas/                     # Zod/JSON Schema validation
│   │   ├── auth-schemas.ts
│   │   ├── collection-schemas.ts
│   │   └── common-schemas.ts
│   │
│   ├── db/
│   │   ├── client.ts                # Drizzle client instance
│   │   ├── migrations/
│   │   │   ├── 0001_init.sql
│   │   │   └── 0002_add_refresh_tokens.sql
│   │   └── schema.ts                # Drizzle table definitions
│   │
│   ├── services/                    # Business logic
│   │   ├── auth-service.ts          # JWT, password hashing
│   │   ├── sync-service.ts          # LWW conflict resolution
│   │   └── collection-service.ts
│   │
│   ├── types/                       # TypeScript interfaces
│   │   ├── auth.ts
│   │   ├── collection.ts
│   │   └── api.ts
│   │
│   ├── utils/
│   │   ├── errors.ts                # Custom error classes
│   │   ├── logger.ts                # Structured logging
│   │   └── crypto.ts                # Token generation
│   │
│   └── middleware/                  # Custom middleware
│       ├── error-handler.ts
│       └── request-logger.ts
│
├── drizzle.config.ts                # Drizzle ORM config
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

**Key Principles:**
- **Auto-loading:** Routes & plugins auto-discovered (fastify-plugin pattern)
- **Separation:** Services handle business logic; routes handle HTTP layer
- **Schemas:** Validation as source of truth (both OpenAPI + runtime)
- **Migrations:** Drizzle handles versioning & schema safety

---

## 2. Authentication Flow (JWT + Refresh Token)

### Overview
```
User Login
    ↓
Generate Tokens:
  - Access:  15-minute JWT (in-memory, memory only on client)
  - Refresh: 7-day token (stored in DB, httpOnly cookie)
    ↓
Return access + refresh tokens
    ↓
Subsequent Requests:
  - Use access token in Authorization header
  - Silent refresh on expiry (before/with 401)
  - Refresh token in secure httpOnly cookie
```

### Implementation Pattern

**Auth Plugin (src/plugins/auth.ts):**
```typescript
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { dbClient } from '../db/client';

export async function authPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  // Custom decorator: Verify & refresh if needed
  fastify.decorate('verifyAuth', async function(request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Custom decorator: Refresh token (silent)
  fastify.decorate('refreshToken', async function(userId: string) {
    const token = generateRefreshToken(userId);

    // Store in DB (replace old token)
    await dbClient.query(
      `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`,
      [userId]
    );
    await dbClient.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    return token;
  });
}
```

**Register Route (src/routes/auth/register.ts):**
```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, generateRefreshToken } from '../../services/auth-service';
import { insertUserSchema } from '../../schemas/auth-schemas';

const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        accessToken: { type: 'string' },
      },
    },
  },
};

export async function registerRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string; password: string } }>(
    '/auth/register',
    { schema: registerSchema },
    async (request, reply) => {
      const { email, password } = request.body;

      // Check existing user
      const existing = await fastify.db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.rows.length > 0) {
        return reply.code(409).send({ error: 'Email already exists' });
      }

      // Hash password & create user
      const hashedPassword = await hashPassword(password);
      const result = await fastify.db.query(
        `INSERT INTO users (id, email, password_hash, created_at)
         VALUES ($1, $2, $3, $4) RETURNING id, email`,
        [crypto.randomUUID(), email, hashedPassword, new Date()]
      );

      const user = result.rows[0];
      const accessToken = fastify.jwt.sign({ sub: user.id, email: user.email });
      const refreshToken = await fastify.refreshToken(user.id);

      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        accessToken,
      });
    }
  );
}
```

**Login Route (src/routes/auth/login.ts):**
```typescript
export async function loginRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    { schema: loginSchema }, // Similar to registerSchema
    async (request, reply) => {
      const { email, password } = request.body;

      const result = await fastify.db.query(
        'SELECT id, password_hash FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const validPassword = await verifyPassword(password, user.password_hash);

      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const accessToken = fastify.jwt.sign({ sub: user.id, email });
      const refreshToken = await fastify.refreshToken(user.id);

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        id: user.id,
        email,
        accessToken,
      });
    }
  );
}
```

**Refresh Route (src/routes/auth/refresh.ts):**
```typescript
export async function refreshRoute(fastify: FastifyInstance) {
  fastify.post(
    '/auth/refresh',
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.code(401).send({ error: 'Refresh token missing' });
      }

      // Verify token in DB
      const result = await fastify.db.query(
        `SELECT user_id FROM refresh_tokens
         WHERE token = $1 AND revoked = false AND expires_at > NOW()`,
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid refresh token' });
      }

      const { user_id } = result.rows[0];
      const accessToken = fastify.jwt.sign({ sub: user_id });

      return reply.send({ accessToken });
    }
  );
}
```

---

## 3. PostgreSQL Schema Design (Drizzle ORM)

### Schema (src/db/schema.ts)

```typescript
import { pgTable, text, timestamp, uuid, serial, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  revoked: boolean('revoked').default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  method: text('method').notNull(), // GET, POST, PUT, DELETE, PATCH
  url: text('url').notNull(),
  headers: jsonb('headers').default({}), // { key: value }
  body: text('body'), // Raw body (JSON, form-encoded, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // For sync: version tracking
  syncVersion: serial('sync_version').notNull().default(0),
  deletedAt: timestamp('deleted_at'), // Soft delete for sync
});

export const environments = pgTable('environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  variables: jsonb('variables').default({}), // { varName: value }
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  collections: many(collections),
  environments: many(environments),
  refreshTokens: many(refreshTokens),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  requests: many(requests),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  collection: one(collections, { fields: [requests.collectionId], references: [collections.id] }),
}));
```

### Migrations Strategy

**Drizzle Migrations (SQL-based for control):**

```sql
-- migrations/0001_init.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- migrations/0002_collections_requests.sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  headers JSONB DEFAULT '{}',
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  sync_version SERIAL NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_requests_collection_id ON requests(collection_id);
CREATE INDEX idx_requests_updated_at ON requests(updated_at);
```

**Run Migrations:**
```bash
# Generate migrations from schema
pnpm drizzle-kit generate:pg --out migrations

# Apply to DB
pnpm drizzle-kit push:pg
```

---

## 4. Input Validation with JSON Schema + Zod

### Approach
- **Fastify routes:** Use JSON Schema (native, compiled by Ajv — zero-overhead)
- **Services/Utils:** Use Zod for runtime safety + transformations

**Auth Schemas (src/schemas/auth-schemas.ts):**
```typescript
import { z } from 'zod';

// Zod (for service layer)
export const registerInputSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 chars'),
});

export const loginInputSchema = registerInputSchema;

// JSON Schema (for Fastify routes — compiled by Ajv)
export const registerFastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string' },
        accessToken: { type: 'string' },
      },
    },
    400: { type: 'object', properties: { error: { type: 'string' } } },
    409: { type: 'object', properties: { error: { type: 'string' } } },
  },
};
```

---

## 5. Error Handling Pattern

**Custom Error Classes (src/utils/errors.ts):**
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}
```

**Error Handler Plugin (src/plugins/error-handler.ts):**
```typescript
import { FastifyInstance } from 'fastify';
import { AppError } from '../utils/errors';

export async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }

    // Log unexpected errors
    fastify.log.error(error);

    return reply.code(500).send({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });
}
```

---

## 6. Folder Auto-Loading Pattern

**Server Setup (src/server.ts):**
```typescript
import Fastify from 'fastify';
import fastifyAutoload from '@fastify/autoload';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // Register all plugins (auto-discovered in src/plugins)
  await fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, 'plugins'),
    options: { prefix: '' },
  });

  // Register all routes (auto-discovered in src/routes)
  await fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, 'routes'),
    options: { prefix: '/api' },
  });

  return fastify;
}
```

**Plugin File (must export plugin function):**
```typescript
// src/plugins/cors.ts
import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });
}
```

---

## 7. Rate Limiting & Security

**Rate Limit Plugin (src/plugins/rate-limit.ts):**
```typescript
import { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

export async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    max: 100, // 100 requests per windowMs
    timeWindow: '15 minutes',
    // Skip auth endpoints
    skip: (request) => request.url.includes('/auth'),
  });
}
```

**Helmet (Security Headers):**
```typescript
import fastifyHelmet from '@fastify/helmet';

export async function helmetPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Configure per your needs
    referrerPolicy: { policy: 'no-referrer' },
  });
}
```

---

## 8. ORM Recommendation: Drizzle vs Prisma vs Raw pg

| Feature | Drizzle | Prisma | Raw pg |
|---|---|---|---|
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Migration Control** | ⭐⭐⭐⭐⭐ (SQL-first) | ⭐⭐⭐ (schema.prisma) | ⭐⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ (lightweight) | ⭐⭐⭐ (gen. overhead) | ⭐⭐⭐⭐⭐ |
| **Fastify Integration** | ⭐⭐⭐⭐⭐ (plugin-friendly) | ⭐⭐ (few examples) | ⭐⭐⭐ |
| **Learning Curve** | Medium | Shallow | Medium |

**Recommendation: Drizzle ORM**
- Schema as TypeScript, migrations as SQL (best of both worlds)
- Lightweight, no runtime schema generation
- Plays well with Fastify hooks & decorators
- Better for sync/versioning (explicit control over schema)

**Why NOT Prisma?**
- Overkill for REST API (better suited for monoliths)
- Less control over migrations (black box generation)
- Extra runtime overhead

---

## 9. Environment & Configuration

**Environment Validation (src/env.ts):**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

**Example .env.example:**
```
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://user:password@localhost:5432/localman
JWT_SECRET=your-super-secret-key-at-least-32-chars-long
REFRESH_TOKEN_SECRET=another-secret-key-at-least-32-chars
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

---

## 10. Testing Pattern (Vitest + Supertest)

**Example Unit Test (src/routes/auth/login.test.ts):**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../server';

describe('POST /api/auth/login', () => {
  let fastify;

  beforeAll(async () => {
    fastify = await buildServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'wrong' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty('error');
  });

  it('should return accessToken and refreshToken on success', async () => {
    // Seed user first
    await fastify.db.query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
      [userId, 'test@example.com', hashedPassword]
    );

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('accessToken');
    expect(response.cookies).toHaveProperty('refreshToken');
  });
});
```

---

## 11. Client-Side Integration Notes

### Access Token Storage
- **DO NOT** store access token in localStorage (XSS vulnerable)
- Store in memory only (React state / Zustand store)
- On page reload, use refresh token to get new access token

### Request Flow (Localman Desktop)
```typescript
// In Zustand auth store
const authStore = create((set, get) => ({
  accessToken: null,

  refreshAccessToken: async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Send cookies
    });
    if (response.ok) {
      const { accessToken } = await response.json();
      set({ accessToken });
    }
  },

  // Called on app init
  initAuth: async () => {
    try {
      await get().refreshAccessToken();
    } catch {
      // No active session
    }
  },
}));

// In API client
const apiClient = {
  async request(url, options = {}) {
    const { accessToken } = authStore.getState();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    if (response.status === 401) {
      // Token expired, refresh
      await authStore.getState().refreshAccessToken();
      // Retry request
      return apiClient.request(url, options);
    }

    return response;
  },
};
```

---

## 12. Deployment Considerations

### Environment-Specific Config
```
Development:  NODE_ENV=development, LOG_LEVEL=debug, no HTTPS required
Staging:      NODE_ENV=production, LOG_LEVEL=info, HTTPS required
Production:   NODE_ENV=production, LOG_LEVEL=warn, HTTPS + WAF required
```

### PostgreSQL Pool Configuration
```typescript
// src/plugins/postgres.ts
export async function postgresPlugin(fastify: FastifyInstance) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20, // Max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  fastify.decorate('db', pool);
  fastify.addHook('onClose', async () => pool.end());
}
```

### Graceful Shutdown
```typescript
// src/main.ts
const fastify = await buildServer();

const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## Summary: Tech Stack Recommendation

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Fastify | Sub-1ms routing, JSON Schema validation, mature plugin ecosystem |
| **Language** | TypeScript | Type safety, better DX, early error detection |
| **Database** | PostgreSQL + Drizzle ORM | SQL control, schema versioning, sync-friendly |
| **Auth** | @fastify/jwt + httpOnly cookies | Secure, standard, no localStorage XSS risk |
| **Validation** | JSON Schema (routes) + Zod (services) | Compile-time + runtime safety |
| **Logging** | Pino + pino-pretty | Structured logging, performance, readable in dev |
| **Testing** | Vitest + Supertest | Fast, ESM-native, Fastify-compatible |
| **Rate Limiting** | @fastify/rate-limit | Built-in, Redis-optional, per-endpoint control |
| **Security** | @fastify/helmet + @fastify/cors | Standard headers, CORS negotiation |

---

## Next Steps for Implementation

1. **Create backend project structure** (Phase 2 kickoff)
2. **Set up PostgreSQL + Drizzle migrations** (init.sql for users, refresh_tokens)
3. **Implement auth routes** (register, login, refresh)
4. **Add collections & requests CRUD** (with sync versioning)
5. **Implement LWW sync engine** (compare `updated_at`, resolve conflicts)
6. **Add E2E tests** (auth flow, concurrent sync)
7. **Deploy to staging** (Railway/Render for testing)

---

## Unresolved Questions

1. **Sync conflict resolution**: Should use LWW by `updated_at`? Or client timestamp (Lamport clock) for concurrent edits?
2. **Partial sync**: Support resuming interrupted syncs (e.g., large collection exports)?
3. **WebSocket support**: Real-time sync for Phase 4 (team collaboration)? Fastify supports via @fastify/websocket.
4. **Event sourcing**: Store audit log of all changes for rollback? (Nice-to-have, not MVP)
5. **Rate limiting**: Global per-user? Per-IP? Per-endpoint? (Recommend per-endpoint + per-user for premium tiers)

