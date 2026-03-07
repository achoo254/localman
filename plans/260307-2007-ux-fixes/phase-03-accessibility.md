---
title: Phase 03 — Accessibility
status: pending
priority: P2
---

# Phase 03 — Accessibility

## Issues

### A1 — MethodSelector combobox missing aria-label
**File:** `src/components/request/method-selector.tsx`
- `<Select.Trigger>` has no accessible name
- Screen readers announce `combobox [ref=e17]` with no context
- **Fix:** Add `aria-label="HTTP method"` to `Select.Trigger` (or `Select.Root`)

### A2 — NameInputDialog input missing label
**File:** `src/components/common/name-input-dialog.tsx`
- Input only has `placeholder`; no `<label>` linked via `htmlFor`/`id` or `aria-label`
- **Fix:** Add `<label htmlFor="name-input" className="sr-only">` with context-aware text (e.g. "Collection name"), or add `aria-label` prop passed from parent dialog

### A3 — History Re-run not a separate keyboard target
**File:** `src/components/history/history-entry-item.tsx`
- Same fix as U4 in Phase 02 — splitting Re-run into its own `<button>` also fixes keyboard navigation
- Coordinate with Phase 02 U4 implementation (no duplicate work)

### A4 — Sidebar tab buttons need clear aria-labels
**File:** `src/components/layout/sidebar.tsx`
- Tab buttons (Collections/History/Environments) have `title` attributes but check if `aria-label` is also set for full screen reader support
- **Fix:** Ensure each sidebar tab `<button>` has `aria-label="Collections"` (etc.) — verify existing `title` is sufficient or add explicit `aria-label`

## Files to Modify
- `src/components/request/method-selector.tsx`
- `src/components/common/name-input-dialog.tsx`
- `src/components/history/history-entry-item.tsx` (shared with Phase 02 U4)
- `src/components/layout/sidebar.tsx`

## Todo
- [ ] A1: aria-label on MethodSelector trigger
- [ ] A2: label/aria-label on NameInputDialog input
- [ ] A3: Re-run as separate button (coordinate with U4)
- [ ] A4: Verify/add aria-labels on sidebar tab buttons

## Success Criteria
- axe/a11y audit passes for these components
- Keyboard navigation reaches Re-run independently of row selection
- Screen reader announces method selector as "HTTP method"
