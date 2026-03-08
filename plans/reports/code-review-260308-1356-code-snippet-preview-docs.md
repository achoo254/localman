# Code Review: Code Snippet, Preview & API Docs

**Date:** 2026-03-08
**Reviewer:** code-reviewer
**Status:** PASS with recommendations

---

## Scope

- **Files reviewed:** 24 (16 generators, registry, barrel, 3 docs components, snippet panel, description editor, url-bar, request-panel, sidebar-tabs, models, database)
- **LOC added:** ~1100 (estimated)
- **Focus:** Full feature review -- snippet generators, docs viewer/export, description editor

## Overall Assessment

Solid implementation. Clean plugin architecture for generators, good lazy-loading for the snippet panel, proper Tauri/browser fallback in export. A few security and correctness issues need attention, mostly around string escaping in generators and the HTML export.

---

## Critical Issues

### 1. [SECURITY] HTML Export: Markdown body content injected without full escaping

**File:** `src/services/docs-export-service.ts` lines 89-94

The `formatRequestMarkdown` function writes `req.body.raw` directly into a markdown code block. When this markdown is converted to HTML via `simpleMarkdownToHtml`, the code block content IS escaped via `escapeHtml()` (line 165). However, `req.description` at line 53-56 is written directly into markdown and then processed by `inlineFormat`, which calls `escapeHtml`. This is safe.

**Verdict:** After tracing the data flow, the HTML export is actually safe -- `escapeHtml` is applied inside code blocks and `inlineFormat` escapes all other content. No XSS vulnerability here. Downgrading to informational.

### 2. [SECURITY] Markdown table values not escaped for pipe characters

**File:** `src/services/docs-export-service.ts` lines 64-66, 76-78

Header keys/values and parameter keys/values are inserted directly into markdown table cells. If a header value contains `|`, it will break the markdown table structure.

```typescript
// Current:
lines.push(`| ${h.key} | ${h.value} |`);
// Fix:
lines.push(`| ${h.key.replace(/\|/g, '\\|')} | ${h.value.replace(/\|/g, '\\|')} |`);
```

**Impact:** Broken export output with certain header/param values. Medium severity.

---

## High Priority

### 3. Snippet generators: No escaping of user input for most languages

All generators insert `req.url`, `req.body`, and header values directly into string literals of the target language. Only cURL (`esc()`) and a few others (PHP, Rust, Java, Kotlin, Swift, C#) escape quotes in the body. But **none** escape the URL or header values.

**Examples of breakage:**
- URL containing a single quote: `https://api.example.com/it's` will break cURL, Python, Ruby, Dart, PHP, PowerShell, HTTPie
- URL containing a double quote: breaks Go, Java, Swift, Kotlin, Rust, C#
- Header values with quotes will break all generators

**Recommendation:** Create a shared `escapeForDoubleQuote(s)` and `escapeForSingleQuote(s)` utility and apply consistently to all string interpolation points. This is the highest-value fix.

**Affected files:** All 16 `generator-*.ts` files.

### 4. JS fetch generator: JSON body handling is incorrect

**File:** `src/services/snippet-generators/generator-javascript-fetch.ts` line 29

```typescript
opts.push(`  body: ${isJson ? `JSON.stringify(${req.body})` : `'${req.body}'`}`);
```

When `isJson` is true, `req.body` is a raw JSON string like `{"name":"test"}`. The generated code becomes:
```javascript
body: JSON.stringify({"name":"test"})
```
This works coincidentally for valid JSON, but if the body is a string with JS-invalid content (e.g., trailing commas, comments), it will produce a syntax error. The safe approach:
```typescript
opts.push(`  body: ${isJson ? `'${req.body.replace(/'/g, "\\'")}'` : `'${req.body}'`}`);
```

### 5. `useMemo` dependency for snippet generation may cause stale results

**File:** `src/components/request/code-snippet-panel.tsx` line 44

```typescript
const snippet = useMemo(() => {
  const ctx = getInterpolationContext();
  const prepared = prepareRequest(request, ctx);
  return generateSnippet(prepared, lang);
}, [request, lang, getInterpolationContext]);
```

`getInterpolationContext` is a Zustand selector returning a function. If the active environment changes but the function reference stays the same (Zustand returns stable selectors), the snippet won't update to reflect new variable values.

**Recommendation:** Add the active environment ID to the dependency array, or subscribe to environment changes explicitly.

### 6. `navigator.clipboard.writeText` unguarded

**File:** `src/components/request/code-snippet-panel.tsx` line 89

```typescript
await navigator.clipboard.writeText(snippet);
```

No try-catch. `navigator.clipboard` can throw if the document is not focused or clipboard permissions are denied (especially in non-Tauri browser mode).

**Fix:**
```typescript
try {
  await navigator.clipboard.writeText(snippet);
  setCopied(true);
  toast('Copied to clipboard');
} catch {
  toast('Failed to copy', { variant: 'error' });
}
```

---

## Medium Priority

### 7. DocsViewerPage loads ALL requests and folders

**File:** `src/components/docs/docs-viewer-page.tsx` lines 23-25

```typescript
const allFolders = useLiveQuery(() => db.folders.toArray(), []);
const allRequests = useLiveQuery(() => db.requests.toArray(), []);
```

This loads the entire requests and folders tables, then filters in JS. For a desktop app with moderate data this is fine, but it's worth noting this won't scale. Could query by `collection_id` index instead:

```typescript
const collectionRequests = useLiveQuery(
  () => effectiveId ? db.requests.where('collection_id').equals(effectiveId).toArray() : [],
  [effectiveId]
);
```

### 8. `collectionFolders.sort()` mutates useMemo result in render

**File:** `src/components/docs/docs-viewer-page.tsx` line 169

```typescript
{collectionFolders.sort((a, b) => a.sort_order - b.sort_order).map(folder => {
```

`Array.sort()` mutates in place. `collectionFolders` comes from `useMemo`, so this mutates the memoized array. Use `[...collectionFolders].sort(...)` or move sorting into the `useMemo`.

### 9. HTTPie generator has dead code path

**File:** `src/services/snippet-generators/generator-httpie.ts` lines 28-37

When `hasBody` is true, both JSON and non-JSON branches return early with a manually constructed string, making the `parts.unshift('echo')` on line 31 dead code (it pushes to `parts` but then a completely new string is returned). The `parts` array built earlier is unused.

### 10. CodeMirror editor recreated on every snippet change

**File:** `src/components/request/code-snippet-panel.tsx` lines 56-81

The `useEffect` creates and destroys a full `EditorView` whenever `snippet` or `langExtension` changes. For frequent changes (typing in URL bar with auto-save), this causes unnecessary DOM churn. Consider using `viewRef.current.dispatch({ changes: ... })` to update the document without recreating the editor.

### 11. Duplicate `METHOD_COLORS` map

**Files:** `src/components/docs/docs-request-card.tsx` and `src/components/docs/docs-table-of-contents.tsx`

Both define `METHOD_COLORS` independently. Extract to a shared constant (e.g., `src/constants/http-methods.ts` or similar).

---

## Low Priority

### 12. CodeMirror only highlights JavaScript, all other languages get plain text

**File:** `src/components/request/code-snippet-panel.tsx` lines 47-53

Only the `javascript` language extension is loaded. All other 14 languages render without syntax highlighting. This is a pragmatic choice to avoid bundle bloat, but worth documenting. Could lazy-load `@codemirror/lang-python`, `@codemirror/lang-rust`, etc. on demand if desired.

### 13. Dexie v2 upgrade is a no-op

**File:** `src/db/database.ts` line 34

`this.version(2).stores({})` with empty stores object. Comment says "no data migration needed" which is correct -- the `description` field is optional and Dexie is schemaless for non-indexed fields. This is fine but the version bump is unnecessary unless you plan to add indexed fields later.

---

## Edge Cases Found

1. **Empty URL in snippet generators:** If `req.url` is empty string, all generators produce valid but useless snippets (e.g., `curl ''`). Consider showing a "No URL" placeholder.
2. **Body on GET requests:** `prepareRequest` correctly strips body for GET (line 14 of request-preparer), but the snippet panel calls `prepareRequest` which handles this. Good.
3. **Collections with no requests:** Handled in DocsViewerPage (line 184) and in export (produces header-only markdown). Good.
4. **Special characters in collection name for export filename:** Line 77 uses `replace(/[^a-zA-Z0-9]/g, '-')` which handles Unicode names but may produce long dashes like `My---Collection`. Minor cosmetic issue.
5. **Nested folders:** `docs-export-service.ts` only handles one level of folders (no recursive). Matches the flat `folder_id` model in `ApiRequest`. Consistent.

---

## Positive Observations

- **Plugin architecture** for snippet generators is clean and extensible -- adding a new language is just a new file + import
- **Lazy loading** of `CodeSnippetPanel` via `React.lazy` avoids loading CodeMirror until needed
- **Tauri/browser dual path** in export with proper error handling
- **`escapeHtml` correctly applied** in the HTML export pipeline
- **react-markdown v10** is used without `rehypeRaw`, so it's XSS-safe by default for the description rendering
- **Collapsible description editor** with markdown preview is a nice UX touch
- **TOC with smooth scrolling** using `scrollIntoView` is well implemented
- **Consistent file naming** follows project kebab-case conventions

---

## Recommended Actions (Priority Order)

1. **HIGH** -- Add string escaping utilities for snippet generators (quotes in URLs, headers, body)
2. **HIGH** -- Guard `navigator.clipboard.writeText` with try-catch
3. **HIGH** -- Fix stale snippet when environment variables change
4. **MEDIUM** -- Escape pipe characters in markdown table export
5. **MEDIUM** -- Fix `collectionFolders.sort()` mutation of memoized array
6. **MEDIUM** -- Optimize CodeMirror to dispatch doc changes instead of recreating editor
7. **LOW** -- Extract shared `METHOD_COLORS` constant
8. **LOW** -- Clean up HTTPie generator dead code

---

## Metrics

- **Type Coverage:** Clean (tsc --noEmit passes)
- **Test Coverage:** 41/41 passing
- **Linting:** Clean (pre-existing issues only)
- **New Dependencies:** react-markdown (already in package.json)

---

## Unresolved Questions

1. Should snippet generators handle `form-data` body type? Currently `prepareRequest` throws for form-data, which would crash the snippet panel.
2. Is there a plan to support nested sub-folders in the docs export? Current model is flat (one level).
