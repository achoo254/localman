# Phase 01 — Fix Lint Errors

## Overview
- **Priority:** P1 (blocks CI)
- **Status:** Pending
- **Effort:** 30 min

Fix 1 ESLint error + 4 warnings blocking CI pipeline.

## Issues

### ERROR (blocking)

**`src/components/layout/app-layout.tsx:42`** — setState synchronously in useEffect

```tsx
// Current (line 37-44):
useEffect(() => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return;
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    setSidebarWidth(clampSidebarWidth(parsed)); // ← setState in effect
  }
}, []);
```

**Fix:** Use lazy initializer in useState instead:
```tsx
const [sidebarWidth, setSidebarWidth] = useState(() => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return SIDEBAR_WIDTH_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : SIDEBAR_WIDTH_DEFAULT;
});
```
Then remove the useEffect block (lines 37-44).

### WARNINGS (non-blocking but fix for clean CI)

1. **`src/components/request/code-snippet-panel.tsx:51`** — unnecessary `activeEnvId` in useMemo deps
   - Remove `activeEnvId` from dependency array if not used in memo body

2. **`src/components/request/request-panel.tsx:93`** — missing `saveRequest` in useEffect deps
   - Add `saveRequest` to dependency array, or wrap in useCallback if needed

3. **`src/components/response/response-actions.tsx:26`** — console.log statement
   - Remove or replace with proper debug logging

4. **`src/components/request/script-editor.tsx:20`** — unused eslint-disable directive
   - Remove `// eslint-disable-next-line react-hooks/exhaustive-deps` on line 20

## Related Code Files

| File | Action |
|------|--------|
| `src/components/layout/app-layout.tsx` | Modify (fix setState in effect) |
| `src/components/request/code-snippet-panel.tsx` | Modify (remove unnecessary dep) |
| `src/components/request/request-panel.tsx` | Modify (add missing dep) |
| `src/components/response/response-actions.tsx` | Modify (remove console.log) |
| `src/components/request/script-editor.tsx` | Modify (remove unused directive) |

## Implementation Steps

1. Fix `app-layout.tsx` — replace useEffect with useState lazy initializer
2. Fix `code-snippet-panel.tsx` — remove unnecessary dep from useMemo
3. Fix `request-panel.tsx` — add missing dep to useEffect
4. Fix `response-actions.tsx` — remove console.log
5. Fix `script-editor.tsx` — remove unused eslint-disable comment
6. Run `pnpm lint` — verify 0 errors, 0 warnings
7. Run `pnpm type-check` — verify clean
8. Run `pnpm test --run` — verify all 41 tests pass

## Todo

- [ ] Fix app-layout.tsx setState in effect
- [ ] Fix 4 ESLint warnings
- [ ] `pnpm lint` passes clean
- [ ] `pnpm type-check` passes
- [ ] `pnpm test --run` passes (41/41)

## Success Criteria

- `pnpm lint && pnpm type-check && pnpm test --run` exits 0
- GitLab CI `lint-and-test` job passes on push
