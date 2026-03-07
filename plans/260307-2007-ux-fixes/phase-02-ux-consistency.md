---
title: Phase 02 — UX Consistency
status: pending
priority: P2
---

# Phase 02 — UX Consistency

## Issues

### U1 — Response status code has no color
**File:** `src/components/response/response-status-bar.tsx`
- `statusColor` utility already extracted to `src/utils/status-color.ts` (done in code review)
- Just needs to be imported and applied to the status code display element
- **Fix:** Import `statusColor` and apply as `className` or `style` to the status code `<span>`

### U2 — Sidebar numbers lack context
**File:** `src/components/collections/collection-item.tsx`
- Numbers shown next to collection name have no tooltip explaining meaning
- **Fix:** Add `title` attribute tooltip showing e.g. "3 requests" or identify if these are sort_order values leaking into the UI (may be a display bug)

### U3 — "Create Collection" vs "+ New collection" label inconsistency
**Files:** `src/components/layout/sidebar.tsx` or `sidebar-tabs.tsx`
- When sidebar is empty: "Create Collection"; when items exist: "+ New collection"
- **Fix:** Standardize to `"+ New collection"` everywhere (or `"New collection"` without `+`), consistent casing

### U4 — History Re-run in same button as entry
**File:** `src/components/history/history-entry-item.tsx`
- Full entry row is one button; "Re-run" text inside creates confusing nested interaction
- **Fix:** Split into: outer div (selectable row) + separate `<button aria-label="Re-run request">` icon button on hover/right side. This also fixes A3.

### U5 — Empty state copy duplicated
**Files:** `src/components/request/request-tab-bar.tsx`, `src/components/request/request-panel.tsx`
- Both show similar "no request open" message
- **Fix:** Keep only one. Panel shows the main empty state with CTA; tab bar can be empty or show a minimal hint.

### U6 — Method selector dropdown uses `▼` text
**File:** `src/components/request/method-selector.tsx`
- Uses raw Unicode `▼` instead of a proper SVG chevron icon
- **Fix:** Replace with `<ChevronDownIcon>` from Radix Icons or inline SVG matching app design

### U7 — Pretty/Raw buttons inconsistent styling
**Files:** `src/components/response/json-viewer.tsx` or `raw-viewer.tsx`
- Button style doesn't match app's standard button component
- **Fix:** Use the same button variant (e.g. `variant="ghost"` or `size="sm"`) as other action buttons in the response panel

## Files to Modify
- `src/components/response/response-status-bar.tsx`
- `src/components/collections/collection-item.tsx`
- `src/components/layout/sidebar.tsx` (or sidebar-tabs)
- `src/components/history/history-entry-item.tsx`
- `src/components/request/request-tab-bar.tsx`
- `src/components/request/request-panel.tsx`
- `src/components/request/method-selector.tsx`
- `src/components/response/json-viewer.tsx`

## Todo
- [ ] U1: Wire statusColor to response status display
- [ ] U2: Add tooltip/fix sidebar number display
- [ ] U3: Standardize "New collection" label
- [ ] U4: Separate Re-run button from entry row
- [ ] U5: Remove duplicate empty state copy
- [ ] U6: Replace ▼ with SVG chevron
- [ ] U7: Consistent Pretty/Raw button style

## Success Criteria
- Status codes are colored (green/orange/red)
- Sidebar numbers have clear tooltip or are removed if they're bugs
- One consistent label for creating collections
- Re-run is a distinct button
- Empty state shown in one place only
