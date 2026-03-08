---
status: complete
created: 2026-03-08
slug: draft-tab-new-request
brainstorm: ../reports/brainstorm-260308-1715-draft-tab-new-request.md
---

# Draft Tab — New Request Feature

## Summary
New request tabs are transient drafts in memory (Zustand). Only persisted to IndexedDB when user explicitly saves via Ctrl+S (opens collection/folder picker dialog) or UI button. Existing saved requests keep auto-save behavior unchanged.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 01 | Store & draft logic | complete | M | request-store.ts |
| 02 | Auto-save + send integration | complete | S | use-auto-save.ts, response-store.ts, request-panel.ts |
| 03 | Save-to-collection dialog | complete | M | save-request-dialog.tsx (NEW) |
| 04 | Tab bar UI + close confirm | complete | M | request-tab-bar.tsx |
| 05 | Keyboard shortcuts + sidebar | complete | S | request-panel.tsx, sidebar-tabs.tsx |

## Key Decisions
- Draft storage: Zustand memory only (lost on app close)
- Save: Ctrl+S → dialog with collection/folder picker
- Close unsaved: Confirm dialog (Save/Don't Save/Cancel)
- Entry: Ctrl+T / "+" button (blank) + sidebar context menu (pre-fill collection)
- Send from draft: allowed, no history saved
- Auto-save: unchanged for saved requests (300ms debounce)

## Dependencies
- Phase 01 must complete first (store is foundation)
- Phases 02-05 can be done sequentially after 01
- Phase 03 (dialog) needed before Phase 05 (Ctrl+S triggers it)
