# Phase 01 — Project Setup

## Context
- [Tauri v2 docs](https://tauri.app/start/)
- [requirement.md](../../requirement.md)

## Overview
- **Priority:** P1 (blocking all other phases)
- **Status:** pending
- **Estimate:** 3 days
- **Description:** Scaffold Tauri v2 + React + TypeScript project with all tooling, design system tokens, and base layout shell.

## Key Insights
- Tauri v2 uses `@tauri-apps/cli` v2 and `@tauri-apps/api` v2 — different from v1
- Use `create-tauri-app` with React + TypeScript template
- Tauri v2 requires Rust 1.77.2+, Node 18+
- Need `tauri-plugin-http` for CORS bypass (v2 plugin system)
- Need `tauri-plugin-shell` for opening external links

## Requirements

### Functional
- Tauri v2 app launches with React frontend
- Hot reload works in dev mode
- Base layout renders (sidebar, main area, status bar)
- Dark theme applied globally

### Non-Functional
- Dev startup < 5s
- Production build < 30MB
- TypeScript strict mode enabled

## Architecture

### Tauri v2 Plugin Config (`tauri.conf.json`)
```json
{
  "plugins": {
    "http": { "scope": ["http://**", "https://**"] }
  }
}
```

### Tailwind Theme Tokens
```js
colors: {
  bg: { primary: '#0d0f14', secondary: '#12151c', tertiary: '#181c25' },
  accent: '#4f8ef7',
  method: { get: '#22c55e', post: '#f97316', put: '#eab308', delete: '#ef4444', patch: '#a855f7' }
}
```

## Related Code Files

### Create
- `package.json` — React + deps
- `tsconfig.json` — strict TS
- `tailwind.config.ts` — design tokens
- `vite.config.ts` — Vite config
- `src-tauri/Cargo.toml` — Rust deps
- `src-tauri/tauri.conf.json` — Tauri config
- `src-tauri/src/main.rs` — Rust entry
- `src-tauri/src/lib.rs` — Tauri setup
- `src/main.tsx` — React entry
- `src/App.tsx` — Root component
- `src/index.css` — Global styles + Tailwind
- `src/components/layout/app-layout.tsx` — Main layout shell
- `src/components/layout/sidebar.tsx` — Left sidebar skeleton
- `src/components/layout/titlebar.tsx` — Custom titlebar
- `src/components/layout/status-bar.tsx` — Bottom status bar
- `src/types/index.ts` — Base type exports

## Implementation Steps

1. **Install prerequisites**
   - Verify Rust (1.77.2+), Node (18+), pnpm
   - Install Tauri CLI: `cargo install tauri-cli --version "^2"`

2. **Scaffold project**
   ```bash
   pnpm create tauri-app localman --template react-ts
   ```

3. **Install frontend deps**
   ```bash
   pnpm add zustand dexie @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
     @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select \
     @radix-ui/react-context-menu @radix-ui/react-toast \
     @codemirror/lang-json @codemirror/lang-javascript codemirror @codemirror/view \
     @tauri-apps/plugin-http @tauri-apps/api clsx tailwind-merge
   pnpm add -D tailwindcss @tailwindcss/vite postcss autoprefixer \
     @types/node prettier eslint
   ```

4. **Install Tauri plugins (Rust side)**
   ```bash
   cd src-tauri
   cargo add tauri-plugin-http tauri-plugin-shell
   ```

5. **Configure Tailwind**
   - Create `tailwind.config.ts` with design system tokens
   - Setup dark theme colors, fonts, spacing (4px base)

6. **Configure Tauri**
   - Update `tauri.conf.json`: window config (1280x800 min), titlebar hidden (custom)
   - Enable HTTP plugin scope for all URLs
   - Set app identifier: `com.localman.app`

7. **Create base layout**
   - `app-layout.tsx`: CSS Grid — sidebar (240px) | main area, status bar at bottom
   - `titlebar.tsx`: drag region, app name, window controls
   - `sidebar.tsx`: placeholder nav icons + collections area
   - `status-bar.tsx`: placeholder DB status

8. **Setup fonts**
   - Download JetBrains Mono + Syne
   - Configure in `index.css` with `@font-face`

9. **Verify**
   - `pnpm tauri dev` — app launches, layout renders
   - Hot reload works on frontend changes

## Todo List
- [ ] Scaffold Tauri v2 + React + TS
- [ ] Install all frontend dependencies
- [ ] Install Tauri plugins (http, shell)
- [ ] Configure Tailwind with design tokens
- [ ] Configure Tauri window + plugins
- [ ] Create base layout components
- [ ] Setup fonts (JetBrains Mono, Syne)
- [ ] Verify dev mode works

## Success Criteria
- `pnpm tauri dev` launches app in < 5s
- Dark theme layout visible with sidebar + main area
- TypeScript strict mode, no compile errors
- All deps resolve correctly

## Risk Assessment
- Tauri v2 plugin API may differ from docs — check latest releases
- Font loading in Tauri webview — use local files, not CDN

## Next Steps
- Phase 02: Database Layer (Dexie.js)
