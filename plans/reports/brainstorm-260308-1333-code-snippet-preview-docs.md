# Brainstorm: Code Snippet, Preview & API Docs

## Problem Statement

Localman lacks 3 key DX features that Postman offers:
1. **Code Snippet generation** — generate request as cURL, JS, Python, etc.
2. **Request Preview** — see fully interpolated request before sending
3. **API Documentation** — describe requests, view collection docs, export

Currently: no preview (only URL tooltip), no code gen, no description fields.

## Decisions Made

### 1. Code Snippet + Preview (merged)
- **Preview = cURL snippet** — cURL is natural preview of resolved request
- **UI**: Sidebar panel, toggle via `</>` icon button on request toolbar
- **Languages**: 15+ (cURL, JS fetch, JS axios, Python requests, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, wget, HTTPie)
- **Features**: Language selector dropdown, Copy button, syntax highlighting
- **Data source**: Uses `prepareRequest()` with interpolation context to get resolved values

### 2. API Docs
- **Description fields**: Markdown editor for each request + collection
- **Docs Viewer**: Dedicated tab/page in sidebar to view entire collection as API docs
- **Export**: HTML and Markdown formats
- **Content**: Auto-includes method, URL, headers, params, body, auth type + user description

### 3. GitLab
- **Milestone**: "Phase 11 - DX Features"
- **Issues**: Separate issues for Code Snippet, Docs, and sub-tasks

## Architecture

### Code Snippet Generator

```
ApiRequest + InterpolationContext
  → prepareRequest() → PreparedRequest
  → snippetGenerator(prepared, language) → string
```

**Generator pattern**: Plugin-based — each language = 1 generator function
```typescript
type SnippetGenerator = (req: PreparedRequest) => string;
const generators: Record<string, SnippetGenerator> = {
  'curl': generateCurl,
  'javascript-fetch': generateJsFetch,
  'python-requests': generatePythonRequests,
  // ...
};
```

**Key files to create:**
- `src/services/snippet-generators/` — generator functions per language
- `src/components/request/code-snippet-panel.tsx` — UI panel

### API Docs

**Data model changes:**
- `ApiRequest.description?: string` — markdown description per request
- `Collection.description?: string` — markdown description per collection

**Key files to create/modify:**
- `src/types/models.ts` — add description fields
- `src/components/docs/` — docs viewer, description editor
- `src/services/docs-export-service.ts` — HTML/Markdown export

## Evaluated Approaches

### Code Snippet UI Placement

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Tab in request tabs | Discoverable | Adds clutter to already 6 tabs | ❌ |
| Response panel tab | Near response context | Confusing — snippet is about request | ❌ |
| **Sidebar panel** | Clean, toggleable, doesn't clutter tabs | Less discoverable initially | ✅ Chosen |
| Floating dialog | Always accessible | Blocks underlying content | ❌ |

### Preview Approach

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Separate Preview tab | Clear, dedicated | Redundant with Code Snippet | ❌ |
| Hover popup on Send | Quick access | Too small for complex requests | ❌ |
| **Merged into Code Snippet** | DRY — cURL = natural preview, no extra UI | Need to switch to cURL for "preview" | ✅ Chosen |

### Docs Approach

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Description fields only | Simple, low effort | No centralized view | ❌ |
| Docs viewer only | Nice overview | No per-request editing | ❌ |
| **Both: Description + Viewer + Export** | Complete solution | More work | ✅ Chosen |

## Implementation Considerations

### Code Snippet
- Reuse `prepareRequest()` — already resolves all variables
- Syntax highlighting via CodeMirror (already in project)
- Generator functions are pure — easy to test
- Start with cURL + JS fetch + Python, add others incrementally
- Each generator ~50-80 lines — keep as separate files

### Docs
- Description stored in IndexedDB alongside request/collection
- Markdown rendering: use `react-markdown` or similar lightweight lib
- Export service generates static HTML with inline CSS for portability
- Docs viewer reads collection tree + all requests, renders as scrollable page

### Risks
- **15+ generators**: High volume but each is simple/mechanical. Can use templates.
- **Markdown editor**: Need lightweight editor, not full CMS. CodeMirror with markdown mode.
- **DB migration**: Adding `description` field — Dexie handles schema upgrades gracefully.
- **Bundle size**: Lazy-load docs viewer and snippet panel (already pattern in codebase).

## Success Criteria
- [ ] Code Snippet panel generates valid, runnable code for all supported languages
- [ ] Copy button works, syntax highlighted
- [ ] Snippets use interpolated values (not raw `{{var}}`)
- [ ] Description fields save/load correctly per request and collection
- [ ] Docs viewer renders full collection hierarchy with descriptions
- [ ] Export produces valid HTML/Markdown files
- [ ] All features lazy-loaded, no impact on initial load

## Milestone: Phase 11 - DX Features

### Issues to create:
1. **Code Snippet: Core generator engine** — plugin pattern, PreparedRequest → string
2. **Code Snippet: cURL + JS fetch + Python generators** — first 3 languages
3. **Code Snippet: Additional generators** — Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, wget, HTTPie
4. **Code Snippet: UI panel** — sidebar panel, language selector, copy, syntax highlight
5. **Docs: Data model** — add description to ApiRequest + Collection, DB migration
6. **Docs: Description editor** — markdown editor in request/collection UI
7. **Docs: Viewer** — dedicated page/tab showing full collection API docs
8. **Docs: Export service** — generate HTML + Markdown from collection

## Next Steps
- Create detailed implementation plan with phases
- Create GitLab milestone + issues
