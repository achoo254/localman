# Code Standards

Coding conventions for Localman — React/TypeScript frontend + Node.js/TypeScript backend.

## General

- **Language:** TypeScript strict mode everywhere (`"strict": true` in tsconfig)
- **No `any`:** Avoid `any`; use `unknown` + type guard, or explicit typed interfaces
- **File size:** Keep files under 200 lines — split into focused modules if larger
- **File naming:** kebab-case for all TS/TSX files (`request-preparer.ts`, `url-bar.tsx`)
- **Imports:** Absolute imports from `src/` via path aliases where configured; relative for sibling files

## TypeScript

```ts
// Good — explicit return type on exported functions
export function prepareRequest(req: ApiRequest, env: Environment): PreparedRequest { ... }

// Bad — implicit any, missing return type
export function prepareRequest(req, env) { ... }

// Good — unknown + type guard instead of any cast
function parseBody(raw: unknown): RequestBody {
  if (typeof raw !== 'object' || raw === null) throw new Error('invalid body')
  ...
}
```

- Use `interface` for object shapes, `type` for unions/aliases
- Prefer `readonly` on function parameters that should not be mutated
- Use discriminated unions for variant types (e.g. auth config: `BearerAuth | BasicAuth | NoAuth`)

## React Components

- **Function components only** — no class components
- **One component per file** — file name matches component name in kebab-case
- **Props interface** declared above the component, named `{ComponentName}Props`
- **No inline styles** — use Tailwind utility classes only
- **No direct DOM manipulation** — use refs only when unavoidable (e.g. focus management)

```tsx
// Good
interface UrlBarProps {
  value: string
  onChange: (value: string) => void
}

export function UrlBar({ value, onChange }: UrlBarProps) {
  return <input value={value} onChange={e => onChange(e.target.value)} />
}
```

## Zustand Stores

- One store per domain (`collections-store.ts`, `request-store.ts`, etc.)
- Export a single hook: `export const useCollectionsStore = create<State>()(...)` 
- Actions defined inside the store (not separate action creators)
- No async logic in store — call service functions, then update state with result

```ts
// Good pattern
const useCollectionsStore = create<CollectionsState>()((set, get) => ({
  collections: [],
  async loadCollections() {
    const items = await db.collections.toArray()
    set({ collections: items })
  },
}))
```

## Dexie / IndexedDB

- All DB operations go through `src/db/database.ts` — never import Dexie directly in components
- Use `db.transaction()` for multi-table writes
- Handle `QuotaExceededError` — use `db-error-handler.ts` utility
- Never store sensitive data (tokens, passwords) in IndexedDB without encryption

## Services

- Services are **stateless pure functions** or classes with no stored state
- Input: typed parameters; Output: typed return value or `Promise<T>`
- All async functions use `try/catch` — never let errors propagate silently
- Services do not import Zustand stores — stores call services, not vice versa

## Error Handling

```ts
// Required pattern for async service functions
async function executeRequest(req: PreparedRequest): Promise<HttpResponse> {
  try {
    const response = await fetch(...)
    return parseResponse(response)
  } catch (err) {
    // Log for debugging, re-throw typed error for caller
    console.error('[http-client] request failed', err)
    throw new HttpClientError('Request failed', { cause: err })
  }
}
```

- Use `toast.error()` for user-visible errors (not `console.error` alone)
- Use `ErrorBoundary` wrappers on major panel components
- Network errors should degrade gracefully (show error state, not crash)

## Backend (Fastify)

- Keep route handlers thin — extract logic to `src/auth.ts` / `src/proxy.ts`
- Use Fastify's built-in schema validation for request bodies
- All errors returned as `{ error: string, message: string }` JSON
- Environment variables validated at startup via `src/env.ts` — fail fast on missing required vars

```ts
// Good — validate env at startup
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true'
if (REQUIRE_AUTH && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required when REQUIRE_AUTH=true')
}
```

## Testing (Vitest)

- Test files: `tests/*.test.ts` (unit) — co-located with source is also acceptable
- Name tests descriptively: `describe('prepareRequest') > it('interpolates {{variables}} in URL')`
- Test happy path + key failure cases (missing field, invalid input, network error)
- No mocking of IndexedDB — use `fake-indexeddb` or in-memory Dexie instance in tests
- Backend tests: use `fastify.inject()` — no real HTTP, no real Firebase calls (mock `verifyIdToken`)

## Commits

Conventional commit format:
```
feat: add PATCH method to HTTP client
fix: prevent history logging for draft requests
refactor: extract proxy handler to separate module
test: add unit tests for variable interpolation
```

No AI references in commit messages.

## Linting

ESLint config is in `eslint.config.js`. Run `pnpm lint` before every commit.
TypeScript: `pnpm type-check` (`tsc --noEmit`) must pass clean.
Do not suppress lint errors with `// eslint-disable` without a comment explaining why.
