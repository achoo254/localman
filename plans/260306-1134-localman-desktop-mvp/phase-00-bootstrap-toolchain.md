# Phase 00 — Bootstrap & Toolchain

## Context
- Precedes all other phases — must be fully defined before any agent starts coding
- Resolves all ambiguous toolchain decisions so agents don't make inconsistent choices

## Overview
- **Priority:** P0 (prerequisite for all phases)
- **Status:** pending
- **Estimate:** 1 day
- **Description:** Canonical toolchain decisions, complete dependency list, testing framework setup, startup hydration pattern, and Vite/Worker config. This is the reference phase all other phases defer to for any toolchain question.

---

## Canonical Toolchain Decisions

| Concern | Decision |
|---|---|
| Package manager | **pnpm** (not npm, not yarn) |
| Unit/integration tests | **Vitest** + `@testing-library/react` |
| E2E tests | **Playwright** |
| Resizable panes | **`react-resizable-panels`** |
| Drag-and-drop | **`@dnd-kit/core` + `@dnd-kit/sortable`** |
| Script sandbox | **`quickjs-emscripten`** (QuickJS WASM) |
| Dexie React hooks | **`dexie-react-hooks`** (for `useLiveQuery`) |
| Icons | **`lucide-react`** |
| Toasts | **Radix UI Toast** (already in Radix deps) |
| Code splitting | Dynamic import for CodeMirror + QuickJS worker |

---

## Complete Dependency List (Phase 01 reference)

### Frontend runtime deps
```bash
pnpm add \
  zustand \
  dexie dexie-react-hooks \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select \
  @radix-ui/react-context-menu @radix-ui/react-toast @radix-ui/react-separator \
  @radix-ui/react-scroll-area @radix-ui/react-switch @radix-ui/react-checkbox \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  react-resizable-panels \
  @codemirror/lang-json @codemirror/lang-javascript @codemirror/lang-xml \
  @codemirror/theme-one-dark codemirror @codemirror/view @codemirror/state \
  quickjs-emscripten \
  @tauri-apps/plugin-http @tauri-apps/plugin-dialog @tauri-apps/plugin-fs \
  @tauri-apps/api \
  lucide-react \
  clsx tailwind-merge \
  date-fns
```

### Frontend dev deps
```bash
pnpm add -D \
  tailwindcss @tailwindcss/vite postcss autoprefixer \
  @types/node \
  prettier eslint @eslint/js eslint-plugin-react-hooks \
  typescript-eslint \
  vitest @vitest/ui jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test
```

### Rust deps (`src-tauri/Cargo.toml`)
```bash
cd src-tauri
cargo add tauri-plugin-http tauri-plugin-shell tauri-plugin-dialog \
         tauri-plugin-fs tauri-plugin-updater
```

---

## Testing Setup

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: ['tests/**', 'node_modules/**'],
  },
});
```

### `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
// Mock Tauri APIs in test env
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));
```

### `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:1420' }, // Tauri dev port
});
```

### Test file conventions
- Unit/integration: `src/**/*.test.ts(x)` — run by Vitest
- E2E: `tests/e2e/**/*.spec.ts` — run by Playwright
- Service tests use real Dexie with in-memory IndexedDB (fake-indexeddb)

```bash
pnpm add -D fake-indexeddb  # for Dexie unit tests without browser
```

---

## Vite Config (Web Worker support for QuickJS)

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { internalIpV4 } from 'internal-ip';
import tailwindcss from '@tailwindcss/vite';

const mobile = !!/android|ios/.exec(process.env.TAURI_ENV_PLATFORM ?? '');

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: mobile ? '0.0.0.0' : false,
    hmr: mobile ? { protocol: 'ws', host: await internalIpV4(), port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  worker: {
    format: 'es',  // Required for QuickJS WASM worker in Vite
  },
  optimizeDeps: {
    exclude: ['quickjs-emscripten'],  // WASM module — don't pre-bundle
  },
}));
```

---

## App Startup Hydration Flow

Zustand stores do NOT auto-hydrate. The app must initialize DB → load stores in order on startup.

### Hydration order (`src/app-initializer.ts`)
```typescript
// Called once in App.tsx useEffect on mount
async function initializeApp() {
  // 1. Ensure DB is open
  await db.open();

  // 2. Load settings first (other stores depend on it)
  await useSettingsStore.getState().hydrate();

  // 3. Load environments (needed for interpolation)
  await useEnvironmentStore.getState().hydrate();

  // 4. Load collections (sidebar)
  await useCollectionsStore.getState().hydrate();

  // 5. Restore open tabs from settings
  await useRequestStore.getState().restoreTabs();

  // 6. Trigger cloud sync if enabled (non-blocking)
  const { syncEnabled } = useSettingsStore.getState();
  if (syncEnabled) {
    useSyncStore.getState().syncAll().catch(console.error);
  }
}
```

### Tab persistence rule (confirmed decision)
- Open tabs ARE persisted across restarts (saved in `settings` table key `open_tabs`)
- Active tab ID persisted as `settings` key `active_tab_id`
- On restore: load request from DB for each tab ID, skip any IDs not found

---

## Startup Loading UX

Show a fullscreen loading screen during hydration (< 300ms typically):
```tsx
// App.tsx
const [ready, setReady] = useState(false);
useEffect(() => {
  initializeApp().then(() => setReady(true));
}, []);
if (!ready) return <AppLoadingScreen />;
```

---

## ESLint Config (`eslint.config.js`)
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', 'no-console': 'warn' } }
);
```

---

## Success Criteria
- `pnpm install` completes without errors
- `pnpm tauri dev` launches app
- `pnpm test` runs Vitest successfully (even if no test files yet)
- `pnpm lint` passes with zero errors
- All TypeScript strict mode enabled

## Next Steps
- Phase 01: Project Setup (scaffold Tauri app, apply these configs)
