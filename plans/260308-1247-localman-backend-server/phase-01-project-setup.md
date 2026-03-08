# Phase 01: Project Setup

## Context Links
- [Plan overview](./plan.md)
- [Fastify patterns report](../reports/researcher-260308-1246-fastify-typescript-backend-patterns.md)

## Overview
- **Priority:** P1 (prerequisite for all other phases)
- **Status:** pending
- **Effort:** 3h
- **Description:** Bootstrap Fastify + TypeScript project in `backend/` subdirectory with all dependencies, folder structure, dev scripts, and base configuration.

## Key Insights
- Use Fastify 5 with ESM (not CommonJS) for modern TypeScript
- Drizzle ORM for SQL-first migrations
- Zod for env validation only; JSON Schema for route validation (Fastify native Ajv)
- pnpm as package manager (consistent with frontend)

## Requirements

### Functional
- Fastify server starts on configurable port (default 3000)
- Health check endpoint: `GET /api/health` returns `{ status: "ok", timestamp }`
- Structured logging via Pino
- Environment validation at startup (fail fast on missing vars)

### Non-Functional
- TypeScript strict mode
- ESM modules
- Hot reload in development (tsx watch)

## Architecture

```
backend/
├── src/
│   ├── main.ts                    # Entry point: start server
│   ├── server.ts                  # Build Fastify instance, register plugins
│   ├── env.ts                     # Zod env validation
│   │
│   ├── plugins/                   # Fastify plugins
│   │   ├── cors.ts
│   │   ├── cookie.ts
│   │   ├── helmet.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   │
│   ├── routes/                    # Route handlers
│   │   ├── health.ts
│   │   ├── auth/                  # Phase 03
│   │   └── sync/                  # Phase 04
│   │
│   ├── db/                        # Database layer
│   │   ├── client.ts              # Drizzle client
│   │   └── schema.ts             # Drizzle table definitions
│   │
│   ├── services/                  # Business logic
│   │   ├── auth-service.ts        # Phase 03
│   │   └── sync-service.ts        # Phase 04
│   │
│   ├── utils/
│   │   └── errors.ts              # Custom error classes
│   │
│   └── types/
│       └── fastify.d.ts           # Fastify type augmentations
│
├── drizzle/                       # Generated migrations
├── drizzle.config.ts
├── .env.example
├── .env
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

## Related Code Files

### Create
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/drizzle.config.ts`
- `backend/src/main.ts`
- `backend/src/server.ts`
- `backend/src/env.ts`
- `backend/src/plugins/cors.ts`
- `backend/src/plugins/cookie.ts`
- `backend/src/plugins/helmet.ts`
- `backend/src/plugins/rate-limit.ts`
- `backend/src/plugins/error-handler.ts`
- `backend/src/routes/health.ts`
- `backend/src/utils/errors.ts`
- `backend/src/types/fastify.d.ts`
- `backend/src/db/client.ts`

## Implementation Steps

### Step 1: Initialize project
```bash
cd backend
pnpm init
```

### Step 2: Install dependencies
```bash
# Core
pnpm add fastify @fastify/cors @fastify/cookie @fastify/helmet @fastify/rate-limit @fastify/jwt

# Database
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Auth
pnpm add bcryptjs
pnpm add -D @types/bcryptjs

# Redis
pnpm add ioredis

# Validation & Utils
pnpm add zod

# Dev
pnpm add -D typescript tsx @types/node vitest
```

### Step 3: Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Create `package.json` scripts
```json
{
  "name": "localman-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "lint": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Step 5: Create `.env.example`
```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# PostgreSQL
DATABASE_URL=postgresql://localman:localman@localhost:5432/localman_dev

# Redis
REDIS_URL=redis://:redis_pass@localhost:6379/0

# JWT
JWT_SECRET=change-me-to-a-random-string-at-least-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

### Step 6: Create `src/env.ts` — Zod env validation
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379/0'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
```

### Step 7: Create `src/utils/errors.ts`
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

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message, 'NOT_FOUND');
  }
}
```

### Step 8: Create `src/server.ts` — build Fastify instance
```typescript
import Fastify from 'fastify';
import { env } from './env.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
  });

  // Register plugins (manually, not autoload — KISS)
  await fastify.register(import('./plugins/error-handler.js'));
  await fastify.register(import('./plugins/cors.js'));
  await fastify.register(import('./plugins/helmet.js'));
  await fastify.register(import('./plugins/cookie.js'));
  await fastify.register(import('./plugins/rate-limit.js'));

  // Register routes
  await fastify.register(import('./routes/health.js'), { prefix: '/api' });

  return fastify;
}
```

### Step 9: Create `src/main.ts` — entry point
```typescript
import { buildServer } from './server.js';
import { env } from './env.js';

async function main() {
  const server = await buildServer();

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
```

### Step 10: Create plugins
Each plugin is a simple Fastify plugin file. See architecture section for file list.

**`src/plugins/cors.ts`:**
```typescript
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../env.js';

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
});
```

**`src/plugins/error-handler.ts`:**
```typescript
import fp from 'fastify-plugin';
import { AppError } from '../utils/errors.js';

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }
    // Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        error: error.message,
        code: 'VALIDATION_ERROR',
      });
    }
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });
});
```

### Step 11: Create `src/routes/health.ts`
```typescript
import type { FastifyInstance } from 'fastify';

export default async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));
}
```

### Step 12: Create `.gitignore`
```
node_modules/
dist/
.env
*.log
```

### Step 13: Add `pnpm add -D pino-pretty fastify-plugin` (dev dependency for pretty logs, fastify-plugin for fp wrapper)

### Step 14: Verify
```bash
cd backend
cp .env.example .env  # edit JWT_SECRET
pnpm dev
# Expect: Server listening on http://0.0.0.0:3000
curl http://localhost:3000/api/health
# Expect: {"status":"ok","timestamp":"..."}
```

## Todo List
- [ ] Initialize project with pnpm
- [ ] Install all dependencies
- [ ] Create tsconfig.json
- [ ] Create env.ts with Zod validation
- [ ] Create error classes
- [ ] Create server.ts with plugin registration
- [ ] Create main.ts entry point
- [ ] Create all plugin files (cors, cookie, helmet, rate-limit, error-handler)
- [ ] Create health route
- [ ] Create .env.example and .gitignore
- [ ] Verify server starts and health endpoint responds
- [ ] Run `tsc --noEmit` to confirm no type errors

## Success Criteria
- `pnpm dev` starts server without errors
- `GET /api/health` returns 200 with `{ status: "ok" }`
- `tsc --noEmit` passes
- CORS headers present in response
- Graceful shutdown on SIGTERM/SIGINT

## Risk Assessment
| Risk | Mitigation |
|---|---|
| ESM import issues with `.js` extensions | Use `tsx` for dev (handles ESM natively) |
| pino-pretty not found in prod | Only use transport in development mode |
| Port conflict with frontend Vite | Frontend on 5173, backend on 3000 |

## Security Considerations
- Helmet adds security headers by default
- Rate limiting prevents abuse (100 req / 15min)
- CORS restricted to configured origin
- No secrets in committed files (.env in .gitignore)
