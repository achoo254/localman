# Phase 03 — Code Snippet UI Panel

## Overview
- **Priority:** P1
- **Status:** Complete
- **Effort:** 3h
- Sidebar panel in request editor, toggle via `</>` icon, language selector, copy, syntax highlight

## Key Insights
- Panel sits inside request panel area, toggled by icon button near URL bar
- Use CodeMirror (already in project) for syntax-highlighted read-only display
- Reactive: snippet regenerates when request changes (method, url, headers, body, auth, params)
- Lazy-load panel component to avoid bundle impact

## Requirements

### Functional
- `</>` icon button in URL bar area (right side, before Send)
- Toggle sidebar panel below URL bar or beside request tabs
- Language selector dropdown (all registered languages)
- Copy to clipboard button with toast feedback
- Syntax-highlighted code display (read-only CodeMirror)
- Auto-regenerate snippet when request or environment changes
- Remember last selected language (persist in settings)

### Non-functional
- Lazy-loaded via `React.lazy`
- Panel height resizable or scrollable
- No impact on initial load performance

## Architecture

```
URL Bar:  [Method] [URL input] [</>] [Send]
                                 ↓ toggle
┌──────────────────────────────────────┐
│ Code Snippet  [JavaScript - fetch ▼] │
│                            [📋 Copy] │
│ ┌──────────────────────────────────┐ │
│ │ const resp = await fetch(        │ │
│ │   'https://api.example.com/...',│ │
│ │   { method: 'GET', ... }        │ │
│ │ );                               │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Related Code Files
- **Create:**
  - `src/components/request/code-snippet-panel.tsx` — main panel component
- **Modify:**
  - `src/components/request/url-bar.tsx` — add `</>` toggle button
  - `src/components/request/request-panel.tsx` — render snippet panel when toggled
  - `src/stores/settings-store.ts` — persist last selected language (optional)

## Implementation Steps

1. Add `</>` icon button to `url-bar.tsx`:
   - Place before Send button
   - Accept `onToggleSnippet` + `isSnippetOpen` props
   - Highlight when panel is open
2. Create `code-snippet-panel.tsx`:
   - Props: `request: ApiRequest`
   - Uses `prepareRequest()` + `getInterpolationContext()` internally
   - Language selector (Radix Select or native select)
   - CodeMirror read-only instance for syntax highlighting
   - Copy button with clipboard API + toast
   - `useMemo` to regenerate snippet on request/language change
3. Update `request-panel.tsx`:
   - Add `isSnippetOpen` state
   - Render `<CodeSnippetPanel>` below URL bar when open (lazy-loaded)
   - Pass `activeRequest` to panel
4. Persist last language in localStorage or settings store

## Todo List
- [x] Add </> toggle button to url-bar.tsx
- [x] Create code-snippet-panel.tsx with language selector + copy
- [x] Integrate CodeMirror read-only for syntax highlighting
- [x] Wire into request-panel.tsx with lazy loading
- [x] Auto-regenerate snippet on request/env changes
- [x] Persist last selected language
- [x] Test UI interaction and keyboard accessibility

## Success Criteria
- Click `</>` toggles snippet panel
- Changing language updates displayed code
- Copy button copies snippet to clipboard
- Snippet reflects current request with interpolated variables
- Panel lazy-loaded, no initial bundle impact
- Works with all HTTP methods and body types

## Risk Assessment
- **Low**: Leverages existing CodeMirror + Radix UI patterns in codebase
- Consider: Panel height management — don't push request tabs off screen
