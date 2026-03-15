---
phase: 01
title: Granular Error Boundaries
priority: critical
status: completed
effort: low
completed: 2026-03-13
---

# Phase 01: Granular Error Boundaries

## Context
- Brainstorm: `plans/reports/brainstorm-260313-1351-offline-first-release-readiness.md`
- Current: Single root `<ErrorBoundary>` in `src/components/common/error-boundary.tsx` (62 lines)
- Problem: Any DB/render error → entire app white screen → must reload

## Overview

Add granular error boundaries around major UI panels so one panel crash doesn't kill the whole app. Add DB error toasts instead of silent failures.

## Key Insights

- Error boundary already exists as class component with `resetKey` prop
- Toast system (`toast()` function) ready to use from `src/components/common/toast-provider.tsx`
- App layout in `src/components/layout/app-layout.tsx` has no inner boundaries

## Related Code Files

**Modify:**
- `src/components/common/error-boundary.tsx` — add `onError` callback prop + variant styles
- `src/components/layout/app-layout.tsx` — wrap sidebar, request panel, response panel

**No changes needed:**
- `src/components/common/toast-provider.tsx` — already working

## Implementation Steps

1. **Enhance ErrorBoundary component:**
   - Add optional `onError?: (error: Error) => void` callback prop
   - Add optional `fallbackSize?: 'full' | 'panel'` prop for different fallback UIs
   - Panel variant: compact inline error with "Retry" button (no full-page styling)
   - "Retry" calls `this.setState({ hasError: false })` to re-render children

2. **Wrap panels in app-layout.tsx:**
   ```tsx
   <ErrorBoundary fallbackSize="panel" resetKey={activeTabId}>
     <Sidebar />
   </ErrorBoundary>
   <ErrorBoundary fallbackSize="panel" resetKey={activeTabId}>
     <RequestPanel />
   </ErrorBoundary>
   <ErrorBoundary fallbackSize="panel" resetKey={activeTabId}>
     <ResponsePanel />
   </ErrorBoundary>
   ```

3. **Add DB error toast utility:**
   - Create `src/utils/db-error-handler.ts`
   - Export `handleDbError(error: unknown, context: string): void`
   - If `QuotaExceededError` → specific toast (reused in Phase 05)
   - Otherwise → generic "Database error in {context}" toast
   - Use in stores that do DB writes (request-store, collections-store, etc.)

## Todo List

- [x] Add `onError` + `fallbackSize` props to ErrorBoundary
- [x] Create panel-sized fallback UI variant
- [x] Wrap sidebar in error boundary in app-layout
- [x] Wrap request panel in error boundary
- [x] Wrap response panel in error boundary
- [x] Create `db-error-handler.ts` utility
- [x] Add try-catch + toast in request-store save operations
- [x] Add try-catch + toast in collections-store CRUD operations
- [x] Verify existing tests still pass
- [x] Manual test: simulate DB error → confirm panel shows fallback, not white screen

## Success Criteria

- DB error in request panel → only request panel shows error, sidebar + response still work
- "Retry" button re-renders the crashed panel
- DB write errors show toast notification
- No regression in existing functionality
