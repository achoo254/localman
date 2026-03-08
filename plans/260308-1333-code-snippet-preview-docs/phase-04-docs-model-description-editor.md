# Phase 04 — API Docs: Data Model + Description Editor

## Overview
- **Priority:** P2
- **Status:** Complete
- **Effort:** 3h
- Add `description` field to `ApiRequest`, markdown editor for request/collection descriptions

## Key Insights
- `Collection` already has `description?: string` — no change needed
- `ApiRequest` needs `description?: string` added
- Dexie.js handles schema migration gracefully — just bump version
- Use CodeMirror with markdown mode for editing (already in project)
- Description displayed as collapsible section above request tabs

## Requirements

### Functional
- `ApiRequest.description?: string` field persisted in IndexedDB
- Collapsible markdown description editor in request panel
- Collection description editable in collection context menu or sidebar
- Markdown preview (toggle between edit/preview)
- Auto-save description on change (same pattern as request auto-save)

### Non-functional
- Markdown rendering: lightweight library (react-markdown or marked)
- No impact on existing data — new field defaults to `undefined`

## Architecture

### Data Model Change
```typescript
// src/types/models.ts
export interface ApiRequest {
  // ... existing fields
  description?: string;  // NEW — markdown description
}
```

### DB Migration
```typescript
// src/db/database.ts — bump version, add description to ApiRequest store
db.version(N).stores({ requests: '...' })
  .upgrade(tx => {
    // No migration needed — optional field, defaults to undefined
  });
```

### UI Layout
```
Request Panel:
┌──────────────────────────────────────┐
│ [Method] [URL] [</>] [Send]          │
│ ▶ Description  [Edit ✏️]             │  ← collapsible
│ ┌──────────────────────────────────┐ │
│ │ Returns user by ID.              │ │  ← markdown preview
│ │ **Auth**: Bearer token required  │ │
│ └──────────────────────────────────┘ │
│ [Params] [Headers] [Body] [Auth]...  │
└──────────────────────────────────────┘
```

## Related Code Files
- **Modify:**
  - `src/types/models.ts` — add `description?: string` to `ApiRequest`
  - `src/db/database.ts` — bump Dexie version (no data migration needed)
  - `src/components/request/request-panel.tsx` — add description section
  - `src/stores/request-store.ts` — ensure `updateActiveRequest` handles `description`
- **Create:**
  - `src/components/request/request-description-editor.tsx` — collapsible markdown editor/preview
- **Install:**
  - `react-markdown` or `marked` — for rendering markdown preview

## Implementation Steps

1. Add `description?: string` to `ApiRequest` in `src/types/models.ts`
2. Bump Dexie version in `src/db/database.ts` (optional field, no migration logic)
3. Install markdown rendering lib: `pnpm add react-markdown` (lightweight, React-native)
4. Create `request-description-editor.tsx`:
   - Collapsible section (default collapsed if empty)
   - Toggle edit/preview modes
   - CodeMirror with markdown mode for editing
   - `react-markdown` for preview rendering
   - Emit `onChange(description)` for auto-save
5. Add description section to `request-panel.tsx` between URL bar and request tabs
6. Ensure collection description is editable (existing field, may need UI)

## Todo List
- [x] Add `description` to `ApiRequest` type
- [x] Bump Dexie version
- [x] Install react-markdown
- [x] Create request-description-editor.tsx
- [x] Integrate into request-panel.tsx
- [x] Add collection description editing (if not already in UI)
- [x] Verify auto-save works with description field
- [x] Type-check passes

## Success Criteria
- Description persists across sessions (IndexedDB)
- Markdown renders correctly in preview mode
- Edit mode provides CodeMirror with markdown syntax highlighting
- Collapsible — doesn't waste space when empty
- Auto-saves on change
- Existing requests without description work without errors

## Risk Assessment
- **Low**: Optional field addition, no breaking changes
- **Dependency**: `react-markdown` adds ~30KB gzipped — acceptable for this feature
- Alternative: use `marked` (smaller) if bundle size is concern
