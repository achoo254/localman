# Phase 01 — Snippet Generator Engine + Core Languages

## Overview
- **Priority:** P1
- **Status:** Complete
- **Effort:** 4h
- Build plugin-based snippet generator engine and first 3 generators (cURL, JS fetch, Python requests)

## Key Insights
- `PreparedRequest` already contains all resolved data: `{ method, url, headers, body }`
- `prepareRequest()` handles variable interpolation — generators receive clean data
- Each generator is a pure function: `(PreparedRequest) => string` — easy to test
- CodeMirror already in project for syntax highlighting

## Requirements

### Functional
- Generator registry: map of language key → generator function
- Generator metadata: display name, language mode (for syntax highlight), file extension
- cURL generator: valid cURL command with all headers, auth, body
- JS fetch generator: native fetch API with async/await
- Python requests generator: `requests.get/post/...` with all params

### Non-functional
- Each generator < 100 lines
- Pure functions, no side effects
- Testable without UI

## Architecture

```
src/services/snippet-generators/
├── snippet-generator-registry.ts    # Registry type + language metadata
├── generator-curl.ts                # cURL
├── generator-javascript-fetch.ts    # JS fetch
└── generator-python-requests.ts     # Python requests
```

### Types
```typescript
// snippet-generator-registry.ts
export interface SnippetLanguage {
  key: string;           // 'curl', 'javascript-fetch'
  label: string;         // 'cURL', 'JavaScript - fetch'
  codemirrorMode: string; // 'shell', 'javascript', 'python'
}

export type SnippetGenerator = (req: PreparedRequest) => string;

export const SNIPPET_LANGUAGES: SnippetLanguage[] = [...];
export const generators: Record<string, SnippetGenerator> = {...};

export function generateSnippet(req: PreparedRequest, lang: string): string;
```

## Related Code Files
- **Modify:** none in this phase
- **Create:**
  - `src/services/snippet-generators/snippet-generator-registry.ts`
  - `src/services/snippet-generators/generator-curl.ts`
  - `src/services/snippet-generators/generator-javascript-fetch.ts`
  - `src/services/snippet-generators/generator-python-requests.ts`
- **Reference:**
  - `src/types/response.ts` — `PreparedRequest` interface
  - `src/services/request-preparer.ts` — `prepareRequest()` function

## Implementation Steps

1. Create `src/services/snippet-generators/` directory
2. Create `snippet-generator-registry.ts`:
   - Define `SnippetLanguage` and `SnippetGenerator` types
   - Export `SNIPPET_LANGUAGES` array with all 15+ language metadata
   - Export `generators` record mapping key → function
   - Export `generateSnippet(req, lang)` wrapper
3. Create `generator-curl.ts`:
   - Handle method, URL, headers (`-H`), body (`-d` or `--data-raw`)
   - Escape single quotes in values
   - Multi-line with `\` continuation for readability
4. Create `generator-javascript-fetch.ts`:
   - Use `fetch()` with `async/await`
   - Include `method`, `headers`, `body` in options
   - `JSON.stringify` body for JSON content type
5. Create `generator-python-requests.ts`:
   - Use `requests.method()` with `headers=`, `data=` or `json=`
   - Auto-detect JSON body → use `json=` param
   - Triple-quote strings for multi-line body

## Todo List
- [x] Create snippet-generator-registry.ts with types + metadata for all 16 languages
- [x] Implement generator-curl.ts
- [x] Implement generator-javascript-fetch.ts
- [x] Implement generator-python-requests.ts
- [x] Write unit tests for all 3 generators
- [x] Verify type-check passes

## Success Criteria
- `generateSnippet(prepared, 'curl')` returns valid, runnable cURL command
- `generateSnippet(prepared, 'javascript-fetch')` returns valid JS code
- `generateSnippet(prepared, 'python-requests')` returns valid Python code
- All generators handle: GET (no body), POST with JSON, PUT with form, headers, auth
- `pnpm type-check` passes

## Risk Assessment
- **Low risk**: Pure functions, no side effects, no DB changes
- Edge case: Special characters in header values / body — ensure proper escaping
