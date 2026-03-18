# Code Standards & Conventions

**Version:** 0.1.0
**Last Updated:** 2026-03-18

This document defines code conventions, file naming, structure patterns, and quality standards for Localman development.

---

## 1. File Naming Conventions

### TypeScript/JavaScript Files

**Pattern:** `kebab-case` with descriptive names. Self-document purpose via filename.

**Good:**
- `request-preparer.ts` — Prepares HTTP requests (variable interpolation, auth)
- `collection-context-menu.tsx` — Context menu for collection items
- `cloud-sync-service.ts` — Cloud synchronization logic
- `use-auto-save-hook.ts` — React hook for auto-save debouncing
- `entity-schema.ts` — Database schema for entities (collections, requests, etc.)

**Bad:**
- `service.ts` — Too vague
- `utils.ts` — Mixing multiple concerns
- `RequestPreparer.ts` — Use kebab-case for TS/JS files
- `rp.ts` — Abbreviations hurt discoverability

**Special Cases:**
- React components: `PascalCase.tsx` if exporting a default component class
- Hooks: `use-*.ts` for custom React hooks
- Services: `*-service.ts` for business logic classes
- Types: `*.ts` (or `types.ts` for shared type definitions)
- Database: `*-schema.ts` for table/store definitions

### Directory Structure

**Pattern:** `kebab-case` for all directories. Group by feature/domain.

```
src/
  components/
    collections/              # Collection/folder management
      collection-tree.tsx
      collection-item.tsx
      create-collection-dialog.tsx
    request/                  # Request builder UI
      url-bar.tsx
      request-tabs.tsx
      body-editor.tsx
    response/                 # Response viewer
      response-body.tsx
      response-headers.tsx
    common/                   # Shared UI components
      key-value-editor.tsx
      syntax-input.tsx
    settings/                 # Settings pages
      general-settings.tsx
      editor-settings.tsx
    layout/                   # App layout
      main-layout.tsx
      titlebar.tsx

  stores/                     # Zustand state stores
    request-store.ts
    collections-store.ts
    sync-store.ts

  services/                   # Business logic
    http-client.ts
    import-export-service.ts
    script-executor.ts
    snippet-generators/       # 16 code snippet generators
      python-generator.ts
      javascript-generator.ts

  db/                         # Database layer
    database.ts               # Dexie.js setup, schemas, migrations

  types/                      # TypeScript type definitions
    models.ts                 # ApiRequest, Collection, Environment, etc.
    response.ts               # HttpResponse, PreparedRequest, etc.

  utils/                      # Utility functions
    variable-interpolation.ts
    format.ts
    clipboard.ts

  index.css                   # Global styles (Tailwind)
  App.tsx                     # Root component
  main.tsx                    # Entry point
```

### Backend (Node.js)

**Pattern:** `kebab-case` for files and directories.

```
backend/src/
  routes/
    health.ts
    workspace-routes.ts
    entity-sync-routes.ts

  middleware/
    auth-guard.ts
    workspace-rbac.ts
    error-handler.ts

  services/
    change-log-service.ts
    merge-engine.ts
    invite-service.ts

  db/
    schema.ts
    entity-schema.ts
    workspace-schema.ts
    user-schema.ts
    client.ts

  types/
    context.ts
    models.ts
```

### Rust (Tauri)

**Pattern:** `snake_case` for files (Rust convention).

```
src-tauri/src/
  lib.rs                  # Tauri commands
  main.rs                 # App entry point
```

---

## 2. TypeScript Conventions

### Strict Mode

All files must pass TypeScript strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
}
```

### Type Definitions

**Pattern:** Define types in `src/types/` directory, organized by domain.

```typescript
// src/types/models.ts
export interface ApiRequest {
  id: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  auth?: AuthConfig;
  preScript?: string;
  postScript?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  requests: ApiRequest[];
  folders: Folder[];
  createdAt: number;
  updatedAt: number;
}
```

**Guidelines:**
- Use `interface` for object shapes (prefer over `type`)
- Use `type` for unions, tuples, and mapped types
- Export types from domain-specific files (`models.ts`, `response.ts`)
- Avoid `any` type (use `unknown` if necessary, with type guards)
- Use optional (`?`) for nullable fields, not `null | undefined`
- Use readonly for immutable collections

### Imports

**Pattern:** Group imports by category, alphabetically within groups.

```typescript
// External libraries
import { useState, useEffect } from 'react';
import { createStore } from 'zustand';

// Internal types
import type { ApiRequest, Collection } from '../types/models';
import type { HttpResponse } from '../types/response';

// Internal services/utils
import { httpClient } from '../services/http-client';
import { interpolateVariables } from '../utils/variable-interpolation';

// Components
import { RequestTabs } from './request-tabs';
import { ResponseViewer } from './response-viewer';

// Styles
import styles from './request-builder.module.css';
```

### Naming Conventions

**Variables & Functions:**
- Use `camelCase` for variables, functions, and methods
- Use `UPPER_SNAKE_CASE` for constants
- Prefix booleans with `is`, `has`, `can`, `should` (e.g., `isLoading`, `hasError`)
- Prefix event handlers with `handle` (e.g., `handleSendClick`, `handleNameChange`)

```typescript
// Constants
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_TIMEOUT_MS = 30000;

// Variables
let currentRequest: ApiRequest | null = null;
const isLoading = false;
const hasError = true;

// Functions
function interpolateVariables(url: string, vars: Record<string, string>): string {
  // ...
}

// Event handlers
function handleSendClick() {
  // ...
}
```

### Comments

**Pattern:** Use comments for *why*, not *what*. Code should be self-documenting.

**Good:**
```typescript
// LWW: Last-Write-Wins conflict resolution by updated_at timestamp
function mergeEntities(local: Entity, remote: Entity): Entity {
  return local.updatedAt > remote.updatedAt ? local : remote;
}

// Debounce auto-save to avoid excessive DB writes
const debouncedSave = debounce(() => database.save(request), 300);
```

**Bad:**
```typescript
// Set the isLoading variable
let isLoading = true;

// Loop through items
for (let i = 0; i < items.length; i++) {
  // ...
}
```

---

## 3. React Component Standards

### Functional Components Only

All components must be functional (no class components). Use hooks for state/lifecycle.

```typescript
// Good
export function RequestBuilder() {
  const [isLoading, setIsLoading] = useState(false);
  const request = useRequest(); // Custom hook

  useEffect(() => {
    // Setup/cleanup
  }, []);

  return <div>{/* JSX */}</div>;
}

// Bad
class RequestBuilder extends React.Component {
  // ...
}
```

### Hook Organization

**Pattern:** Group hooks logically at component start.

```typescript
export function RequestPanel() {
  // State hooks
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Store hooks (Zustand)
  const request = useRequest();
  const response = useResponse();

  // Custom hooks
  const { data, refetch } = useLiveQuery(() => db.requests.get(id));

  // Effects
  useEffect(() => {
    // Auto-save logic
    const timer = setTimeout(() => {
      saveRequest(request);
    }, 300);

    return () => clearTimeout(timer);
  }, [request]);

  // Render
  return <div>{/* JSX */}</div>;
}
```

### Component Props

**Pattern:** Use TypeScript interfaces for props. Avoid prop spreading.

```typescript
interface RequestTabsProps {
  requestId: string;
  defaultTab?: 'params' | 'headers' | 'body' | 'auth' | 'scripts';
  onBodyChange?: (body: string) => void;
  readOnly?: boolean;
}

export function RequestTabs({
  requestId,
  defaultTab = 'body',
  onBodyChange,
  readOnly = false,
}: RequestTabsProps) {
  // Component logic
}
```

### Conditional Rendering

**Pattern:** Prefer ternary for simple conditions; use early returns for complex logic.

```typescript
// Simple: use ternary
return isLoading ? <Spinner /> : <Content />;

// Complex: use early return in render helper
function renderContent() {
  if (error) return <ErrorBoundary error={error} />;
  if (isLoading) return <Spinner />;
  if (!data) return <EmptyState />;
  return <List items={data} />;
}

return <div>{renderContent()}</div>;
```

### Key Props in Lists

**Always** use stable, unique keys (not array indices).

```typescript
// Good
{requests.map(request => (
  <RequestItem key={request.id} request={request} />
))}

// Bad
{requests.map((request, index) => (
  <RequestItem key={index} request={request} />
))}
```

---

## 4. Zustand Store Standards

**Pattern:** One store per domain. Co-locate with components.

```typescript
// src/stores/request-store.ts
import { create } from 'zustand';
import type { ApiRequest } from '../types/models';

interface RequestState {
  currentRequest: ApiRequest | null;
  draft: Partial<ApiRequest>;
  isLoading: boolean;
  error: Error | null;

  // Actions
  setCurrentRequest: (request: ApiRequest) => void;
  updateDraft: (partial: Partial<ApiRequest>) => void;
  saveRequest: () => Promise<void>;
  reset: () => void;
}

export const useRequest = create<RequestState>((set) => ({
  currentRequest: null,
  draft: {},
  isLoading: false,
  error: null,

  setCurrentRequest: (request) => set({ currentRequest: request, draft: request }),

  updateDraft: (partial) => set((state) => ({
    draft: { ...state.draft, ...partial },
  })),

  saveRequest: async () => {
    set({ isLoading: true });
    try {
      const saved = await database.requests.put(draft);
      set({ currentRequest: saved, isLoading: false });
    } catch (err) {
      set({ error: err as Error, isLoading: false });
    }
  },

  reset: () => set({
    currentRequest: null,
    draft: {},
    isLoading: false,
    error: null,
  }),
}));
```

**Guidelines:**
- Keep state flat (avoid deep nesting)
- Separate read state from write state
- Use immutable updates (spread operator)
- Action names: `set*` (update), `add*` (create), `remove*` (delete), `reset` (clear)
- Avoid circular dependencies between stores

---

## 5. Service Layer Standards

**Pattern:** Business logic in services, not components. Services are singletons.

```typescript
// src/services/http-client.ts
export class HttpClient {
  async execute(request: ApiRequest): Promise<HttpResponse> {
    // Prepare request
    const prepared = this.prepareRequest(request);

    // Execute via Tauri HTTP plugin
    try {
      const response = await invoke<HttpResponse>('execute_http', {
        method: prepared.method,
        url: prepared.url,
        headers: prepared.headers,
        body: prepared.body,
      });

      return response;
    } catch (err) {
      throw new Error(`HTTP request failed: ${err.message}`);
    }
  }

  private prepareRequest(request: ApiRequest): PreparedRequest {
    // ...
  }
}

export const httpClient = new HttpClient();
```

**Export Pattern:**
```typescript
// Create singleton instance, export it
export const httpClient = new HttpClient();
export const scriptExecutor = new ScriptExecutor();
export const importExportService = new ImportExportService();
```

**Usage in Components:**
```typescript
// Components import the service instance
import { httpClient } from '../services/http-client';

export function SendButton() {
  const handleSend = async () => {
    const response = await httpClient.execute(request);
  };
}
```

---

## 6. Database (Dexie.js) Standards

**Pattern:** Database layer in `src/db/database.ts`. Use live queries for reactivity.

```typescript
// src/db/database.ts
import Dexie, { type Table } from 'dexie';
import type { Collection, ApiRequest, Environment } from '../types/models';

export class LocalmanDB extends Dexie {
  collections!: Table<Collection>;
  requests!: Table<ApiRequest>;
  environments!: Table<Environment>;
  history!: Table<ExecutionHistory>;
  settings!: Table<Setting>;
  pendingSync!: Table<PendingChange>;
  drafts!: Table<Draft>;

  constructor() {
    super('localman');
    this.version(4).stores({
      collections: 'id, workspaceId, updatedAt',
      requests: 'id, collectionId, updatedAt',
      environments: 'id, workspaceId, name',
      history: '++, timestamp, requestId',
      settings: 'key',
      pendingSync: '++, entityType, syncStatus',
      drafts: 'id',
    });
  }
}

export const db = new LocalmanDB();

// Live query (reactive DB updates)
export function useLiveRequests(collectionId: string) {
  return useLiveQuery(
    () => db.requests.where('collectionId').equals(collectionId).toArray(),
    [collectionId],
  );
}
```

**Guidelines:**
- Define schema in `constructor` with version number
- Use live queries with `liveQuery()` hook for reactivity
- Always use indexes for frequently queried fields
- Keep DB operations in service layer, not components
- Use `db.transaction()` for atomic multi-table operations

---

## 7. Error Handling

**Pattern:** Use Try-Catch + Error Boundaries. Always handle errors gracefully.

```typescript
// Function-level error handling
async function sendRequest(request: ApiRequest) {
  try {
    const response = await httpClient.execute(request);
    return response;
  } catch (err) {
    console.error('Request failed:', err);
    throw new Error(`Failed to send request: ${err.message}`);
  }
}

// Component-level error handling
export function RequestPanel() {
  const [error, setError] = useState<Error | null>(null);

  const handleSend = async () => {
    try {
      const response = await sendRequest(request);
      // Success logic
    } catch (err) {
      setError(err as Error);
      // Show error toast
    }
  };

  if (error) {
    return <ErrorMessage error={error} onDismiss={() => setError(null)} />;
  }

  return <RequestBuilder onSend={handleSend} />;
}

// Error boundary wrapper
export function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
```

**Guidelines:**
- Never silently swallow errors (`catch` without logging/handling)
- Use Error Boundaries for component crashes
- Provide user-friendly error messages (not technical stack traces)
- Log errors with context (what action triggered it, relevant state)
- Use specific error types (extend Error class if needed)

---

## 8. Tauri Integration

**Pattern:** Use Tauri's `invoke()` for IPC. Avoid window/DOM manipulation.

```typescript
// src/utils/tauri-http-client.ts
import { invoke } from '@tauri-apps/api/core';

export async function executeTauriHttpRequest(
  method: string,
  url: string,
  headers?: Record<string, string>,
  body?: string,
): Promise<HttpResponse> {
  try {
    const response = await invoke<HttpResponse>('execute_http', {
      method,
      url,
      headers,
      body,
    });
    return response;
  } catch (err) {
    throw new Error(`Tauri HTTP failed: ${err}`);
  }
}
```

**Guidelines:**
- Use `invoke()` for all Tauri commands (HTTP, dialogs, file access)
- Never use `fetch()` in Tauri window (use Tauri HTTP plugin instead)
- Type Tauri responses with generics: `invoke<ResponseType>()`
- Handle plugin unavailability gracefully (show error, not silent fail)

---

## 9. State Flow Pattern

**Principle:** Unidirectional data flow: Component → Store → Service → DB → Store → Component

```
User Interaction (click, type)
        ↓
Component Handler (handleSendClick)
        ↓
Store Action (useRequest().saveRequest())
        ↓
Service Logic (httpClient.execute())
        ↓
DB Operation (database.requests.put())
        ↓
Store Update (set({ currentRequest: saved }))
        ↓
Component Re-render (useRequest() hook)
```

---

## 10. Testing Standards

### Unit Tests (Vitest)

**Pattern:** Test behavior, not implementation. Use descriptive test names.

```typescript
// src/services/request-preparer.test.ts
import { describe, it, expect } from 'vitest';
import { prepareRequest } from './request-preparer';

describe('RequestPreparer', () => {
  it('should interpolate variables in URL', () => {
    const request = {
      url: '{{baseUrl}}/users/{{userId}}',
      // ...
    };
    const variables = { baseUrl: 'https://api.example.com', userId: '123' };

    const prepared = prepareRequest(request, variables);

    expect(prepared.url).toBe('https://api.example.com/users/123');
  });

  it('should add Authorization header for Bearer auth', () => {
    const request = {
      auth: { type: 'bearer', token: 'abc123' },
      // ...
    };

    const prepared = prepareRequest(request, {});

    expect(prepared.headers['Authorization']).toBe('Bearer abc123');
  });
});
```

### E2E Tests (Playwright)

**Pattern:** Test user workflows, not individual components.

```typescript
// e2e/send-request.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and send a GET request', async ({ page }) => {
  await page.goto('/');

  // Create collection
  await page.click('button:has-text("New Collection")');
  await page.fill('input[placeholder="Collection name"]', 'My API');
  await page.click('button:has-text("Create")');

  // Create request
  await page.click('button:has-text("New Request")');
  await page.fill('input[placeholder="Request name"]', 'Get Users');
  await page.fill('input[placeholder="URL"]', 'https://api.example.com/users');

  // Send request
  await page.click('button:has-text("Send")');

  // Verify response
  await expect(page.locator('[data-test="response-status"]')).toContainText('200');
});
```

---

## 11. Performance Considerations

### Code Splitting

- Use React lazy loading for large components
- Dynamic imports for services used conditionally

```typescript
const ScriptEditor = lazy(() => import('./script-editor'));

export function RequestTabs() {
  return (
    <Suspense fallback={<Spinner />}>
      <ScriptEditor />
    </Suspense>
  );
}
```

### Memoization

- Use `useMemo()` for expensive computations
- Use `useCallback()` for stable function references
- Use `React.memo()` for expensive components

```typescript
const preparedRequest = useMemo(
  () => prepareRequest(request, variables),
  [request, variables],
);

const handleSend = useCallback(async () => {
  await httpClient.execute(preparedRequest);
}, [preparedRequest]);
```

### Bundle Size

- Audit with `npm run build --analyze`
- Lazy load non-critical UI (modals, settings)
- Prefer tree-shakeable libraries
- Avoid bundling large dev dependencies

---

## 12. Code Quality Tools

### Pre-commit Checks

**Run before every commit:**
```bash
pnpm lint                    # ESLint
pnpm type-check             # TypeScript
pnpm test                   # Vitest unit tests
pnpm test:e2e               # Playwright E2E
```

### Continuous Integration

**GitHub Actions run on every push:**
- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (Vitest)
- E2E tests (Playwright)
- Build verification

### Code Review Checklist

- [ ] Code follows naming/style conventions
- [ ] TypeScript strict mode passes
- [ ] No `any` types (except unavoidable)
- [ ] Tests added for new features
- [ ] Error handling included
- [ ] Comments explain *why*, not *what*
- [ ] No console.log() left in code
- [ ] Bundle size impact acceptable

---

## 13. Documentation in Code

### JSDoc for Public APIs

```typescript
/**
 * Interpolates variables in a string.
 *
 * Supports:
 * - Named variables: {{varName}}
 * - Dynamic variables: {{$guid}}, {{$timestamp}}
 *
 * @param text - The string to interpolate
 * @param variables - Key-value map of variables
 * @returns Interpolated string
 *
 * @example
 * interpolateVariables('https://api.example.com/{{path}}', { path: 'users' })
 * // => 'https://api.example.com/users'
 */
export function interpolateVariables(
  text: string,
  variables: Record<string, string>,
): string {
  // ...
}
```

---

## 14. Deprecation & Breaking Changes

**Pattern:** Mark deprecated code, plan removal.

```typescript
/**
 * @deprecated Use `httpClient.execute()` instead. Will be removed in v0.2.0
 */
export function oldExecuteRequest() {
  // ...
}
```

---

## References

- **ESLint Config:** `eslint.config.js`
- **TypeScript Config:** `tsconfig.json`
- **Prettier Config:** Configured in ESLint
- **Vitest Config:** `vite.config.ts`
- **Playwright Config:** `playwright.config.ts`
- **Tailwind Config:** `tailwind.config.js`

---

**Document Maintainer:** Development Team
**Last Review:** 2026-03-18
