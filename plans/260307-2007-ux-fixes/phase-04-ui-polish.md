---
title: Phase 04 — UI Polish
status: pending
priority: P3
---

# Phase 04 — UI Polish

## Issues

### P1 — Status bar padding too tight
**File:** `src/components/layout/status-bar.tsx`
- Content sits too close to screen edge
- **Fix:** Add `px-3` or `px-4` padding to the status bar container, verify left/right spacing matches design

### P2 — Settings editor checkboxes misaligned
**File:** Settings editor component (search for "Word wrap" or "Line numbers" checkboxes)
- Checkboxes not vertically centered with their label text
- **Fix:** Ensure checkbox+label wrapper uses `flex items-center gap-2`

### P3 — Response tabs hit-area too small
**File:** `src/components/response/response-tabs.tsx`
- Body/Headers/Cookies tabs have smaller font/padding than request tabs
- **Fix:** Match padding/font-size of request panel tabs (check `request-tab-bar.tsx` or `body-tab.tsx` styles for reference values)

## Files to Modify
- `src/components/layout/status-bar.tsx`
- Settings editor component (find by searching "Word wrap")
- `src/components/response/response-tabs.tsx`

## Todo
- [ ] P1: Add proper padding to status bar
- [ ] P2: Fix checkbox vertical alignment in settings
- [ ] P3: Increase response tab hit area / font size

## Success Criteria
- Status bar has comfortable padding from edges
- Settings checkboxes align center with label text
- Response tabs feel same size/weight as request tabs
