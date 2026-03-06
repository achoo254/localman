# Phase 06 — Environments & Variable Interpolation

## Context
- [requirement.md Section 4.4](../../requirement.md) — Environments & Variables
- Depends on: Phase 01, Phase 02, Phase 04

## Overview
- **Priority:** P1
- **Status:** pending
- **Estimate:** 4 days
- **Description:** Multiple environments with variables, interpolation engine for URL/headers/body, secret variables, dynamic variables, environment bar.

## Key Insights
- Variables use `{{variableName}}` syntax — same as Postman
- Interpolation order: Dynamic vars > Environment vars > Global vars
- Secret variables: stored in DB, masked in UI (`••••••`), revealed on hover/click
- Dynamic variables: `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`, `{{$randomEmail}}` etc.
- Environment bar sits between titlebar and main content — always visible

## Requirements

### Functional
- Create/edit/delete environments (Dev, Staging, Prod, etc.)
- Global variables (available in all environments)
- Per-environment variables (override globals)
- Active environment selector in env bar
- Variable interpolation in: URL, query params, headers, body, auth fields
- Variable preview on hover (show resolved value)
- Secret variables (masked in UI, not exported by default)
- Dynamic variables: `$guid`, `$timestamp`, `$randomInt`, `$isoTimestamp`
- Quick environment variable editor (inline from env bar)

### Non-Functional
- Interpolation < 1ms for typical request
- Environment switch updates all previews instantly

## Architecture

### Interpolation Engine
```typescript
// src/services/interpolation-engine.ts

function interpolate(template: string, context: InterpolationContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();

    // Dynamic variables
    if (trimmed.startsWith('$')) return resolveDynamic(trimmed);

    // Environment vars (active env) -> Global vars
    return context.envVars[trimmed] ?? context.globalVars[trimmed] ?? match;
  });
}

interface InterpolationContext {
  envVars: Record<string, string>;
  globalVars: Record<string, string>;
}
```

### Dynamic Variables
```typescript
const dynamicResolvers: Record<string, () => string> = {
  '$guid': () => crypto.randomUUID(),
  '$timestamp': () => Math.floor(Date.now() / 1000).toString(),
  '$isoTimestamp': () => new Date().toISOString(),
  '$randomInt': () => Math.floor(Math.random() * 1000).toString(),
  '$randomEmail': () => `user${Date.now()}@example.com`,
  '$randomColor': () => '#' + Math.floor(Math.random()*16777215).toString(16),
};
```

### Zustand Store — `environment-store.ts`
```typescript
interface EnvironmentStore {
  environments: Environment[];
  globalVariables: EnvVariable[];
  activeEnvironmentId: string | null;

  // Computed
  getInterpolationContext: () => InterpolationContext;

  // Actions
  setActiveEnvironment: (id: string | null) => void;
  createEnvironment: (name: string) => Promise<void>;
  updateVariable: (envId: string, variable: EnvVariable) => Promise<void>;
  // ...CRUD
}
```

## Related Code Files

### Create
- `src/services/interpolation-engine.ts` — Variable interpolation core
- `src/services/dynamic-variables.ts` — Dynamic variable resolvers
- `src/stores/environment-store.ts` — Zustand store
- `src/components/environments/environment-bar.tsx` — Top env selector bar
- `src/components/environments/environment-selector.tsx` — Dropdown selector
- `src/components/environments/environment-manager.tsx` — Full env editor dialog
- `src/components/environments/variable-table.tsx` — Variable key-value editor
- `src/components/environments/environment-sidebar-tab.tsx` — Sidebar env tab
- `src/components/common/variable-highlight-input.tsx` — Update with resolve preview

### Modify
- `src/services/request-preparer.ts` — Integrate interpolation before send
- `src/components/request/url-bar.tsx` — Show variable preview on hover
- `src/components/layout/app-layout.tsx` — Add environment bar

## Implementation Steps

1. **Create interpolation engine**
   - Regex-based `{{var}}` replacement
   - Support nested resolution (var value contains another `{{var}}`)? — No, keep simple for MVP
   - Return unresolved vars as-is (keep `{{unknown}}` in output)
   - Track which vars were resolved vs unresolved (for UI feedback)

2. **Create dynamic variables service**
   - Map of `$name` -> resolver function
   - Each invocation generates fresh value

3. **Create environment Zustand store**
   - CRUD wrapping DB environment service
   - Active environment persisted in settings
   - Computed interpolation context (merge active env + globals)

4. **Build environment bar**
   - Horizontal bar below titlebar
   - Environment dropdown selector (Radix Select)
   - "No Environment" option
   - Quick "eye" button to preview active variables
   - "Manage Environments" link -> opens manager dialog

5. **Build environment manager dialog**
   - Left: list of environments (create, delete, duplicate)
   - Right: variable table for selected environment
   - Separate "Globals" section
   - Variable table: key, value, type (text/secret), description

6. **Build variable table**
   - Reuse key-value editor pattern from Phase 03
   - Add "secret" toggle (eye icon) — masks value
   - Add "type" column for future expansion

7. **Integrate interpolation into request preparer**
   - Before sending: interpolate URL, each header value, body string, auth fields
   - Pass interpolation context from environment store

8. **Update URL bar with variable preview**
   - On hover over `{{var}}`, show tooltip with resolved value
   - Unresolved vars shown in red/warning color
   - Resolved vars shown in accent blue

9. **Build sidebar environments tab**
   - List environments with active indicator
   - Quick switch active env
   - Link to environment manager

## Todo List
- [ ] Create interpolation engine service
- [ ] Create dynamic variables service
- [ ] Create environment Zustand store
- [ ] Build environment bar with selector
- [ ] Build environment manager dialog
- [ ] Build variable table editor
- [ ] Integrate interpolation into request preparer
- [ ] Update URL bar with variable hover preview
- [ ] Build sidebar environments tab
- [ ] Handle secret variables (masked display)

## Success Criteria
- Variables in `{{url}}/path` resolve correctly when request sent
- Environment switch changes resolved values immediately
- Secret variables masked, revealed on click
- Dynamic variables generate unique values per request
- Global vars accessible in all environments
- Env-specific vars override globals

## Risk Assessment
- Recursive variable resolution (var A references var B) — skip for MVP, keep single-pass
- Secret variable leakage in history/export — mask in history, exclude from default export

## Next Steps
- Phase 07: History
