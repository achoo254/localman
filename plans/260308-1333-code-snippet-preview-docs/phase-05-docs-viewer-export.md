# Phase 05 — API Docs: Viewer + Export

## Overview
- **Priority:** P2
- **Status:** Complete
- **Effort:** 3h
- Docs viewer page showing full collection API docs + export to HTML/Markdown

## Key Insights
- Viewer reads collection tree (folders + requests) and renders as scrollable docs page
- Export generates static HTML (with inline CSS) or Markdown file
- Reuse `collection-service` to fetch collection tree data
- Reuse `react-markdown` from Phase 4 for rendering
- Access via sidebar tab (alongside Collections, Environments, History)

## Requirements

### Functional
- Sidebar tab "Docs" to open docs viewer
- Select collection to view its API documentation
- Render: collection name/description, folder hierarchy, each request with:
  - Method badge + URL
  - Description (markdown)
  - Headers, params, auth type, body type
  - Example request/response (from last history entry, if available)
- Export button: generate HTML or Markdown file
- Tauri save dialog for export file location

### Non-functional
- Lazy-loaded docs viewer
- Scrollable with table of contents sidebar (anchor links)
- Print-friendly HTML export

## Architecture

### UI Layout
```
Sidebar:
[Collections] [Environments] [History] [📖 Docs]

Main area (when Docs tab active):
┌──────────────┬──────────────────────────────────┐
│ TOC          │ API Documentation                 │
│              │                                   │
│ ▸ Users      │ # My API Collection               │
│   GET /users │ Collection description here...    │
│   POST /users│                                   │
│ ▸ Auth       │ ## Users                           │
│   POST /login│ ### GET /api/users                │
│              │ Returns list of users.             │
│              │ **Headers:** Authorization: Bearer │
│              │ **Params:** page, limit            │
│              │                                   │
│              │ ### POST /api/users                │
│              │ Creates a new user...              │
│              │                                   │
│ [Export ▼]   │                                   │
│ · HTML       │                                   │
│ · Markdown   │                                   │
└──────────────┴──────────────────────────────────┘
```

### Export Service
```typescript
// src/services/docs-export-service.ts
export function exportCollectionAsHtml(collection, folders, requests): string;
export function exportCollectionAsMarkdown(collection, folders, requests): string;
```

## Related Code Files
- **Create:**
  - `src/components/docs/docs-viewer-page.tsx` — main docs viewer
  - `src/components/docs/docs-request-card.tsx` — single request documentation card
  - `src/components/docs/docs-table-of-contents.tsx` — TOC sidebar
  - `src/services/docs-export-service.ts` — HTML + Markdown export
- **Modify:**
  - `src/components/collections/sidebar-tabs.tsx` — add "Docs" tab
  - `src/components/layout/main-layout.tsx` — render docs viewer when Docs tab active

## Implementation Steps

1. Create `docs-export-service.ts`:
   - `exportCollectionAsMarkdown()`: Generate markdown with headings, method badges, descriptions
   - `exportCollectionAsHtml()`: Wrap markdown output in styled HTML template (dark theme)
2. Create `docs-request-card.tsx`:
   - Renders single request: method badge, URL, description, headers, params, auth
   - Foldable sections for details
3. Create `docs-table-of-contents.tsx`:
   - Tree of folder → requests with anchor links
   - Highlights current section on scroll
4. Create `docs-viewer-page.tsx`:
   - Collection selector dropdown
   - Loads collection tree via collection-service
   - Renders TOC + request cards
   - Export button with format selector (HTML/Markdown)
   - Tauri `save` dialog for file export
5. Add "Docs" tab to sidebar-tabs.tsx
6. Wire docs viewer into main layout

## Todo List
- [x] Create docs-export-service.ts (HTML + Markdown)
- [x] Create docs-request-card.tsx
- [x] Create docs-table-of-contents.tsx
- [x] Create docs-viewer-page.tsx
- [x] Add Docs tab to sidebar
- [x] Wire into main layout
- [x] Implement Tauri save dialog for export
- [x] Test with real collection data
- [x] Verify lazy loading

## Success Criteria
- Docs viewer renders full collection hierarchy
- Each request shows method, URL, description, headers, params
- TOC navigation works with anchor links
- Export HTML produces standalone file with inline styles
- Export Markdown produces valid .md file
- Tauri save dialog works for file export
- Lazy-loaded, no initial bundle impact

## Risk Assessment
- **Medium**: Largest UI component — needs careful layout/scroll management
- TOC scroll-spy can be tricky — keep implementation simple (IntersectionObserver)
- Export HTML styling — use minimal inline CSS, test in browser
