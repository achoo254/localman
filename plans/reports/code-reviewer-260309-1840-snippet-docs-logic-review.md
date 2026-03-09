# Code Review: Snippet Generator, Preview & API Docs — Logic Correctness

**Date:** 2026-03-09
**Reviewer:** code-reviewer
**Focus:** Logic correctness, edge cases, type safety, export validity

---

## Scope

- **Snippet engine:** Registry, escape utils, 5 generators (curl, js-fetch, python-requests, go-native, rust-reqwest), plus spot-checks on powershell and httpie
- **Snippet UI:** `code-snippet-panel.tsx`
- **Description editor:** `request-description-editor.tsx`, `models.ts`
- **Docs viewer/export:** `docs-viewer-page.tsx`, `docs-request-card.tsx`, `docs-table-of-contents.tsx`, `docs-export-service.ts`
- **Data flow:** `request-preparer.ts` -> `PreparedRequest` -> generators
- **TypeScript:** Clean — `tsc --noEmit` passes with zero errors
- **ESLint:** 1 warning (unnecessary dep in useMemo — intentional for reactivity)

---

## Critical Issues

**None found.** No security vulnerabilities, data loss risks, or breaking changes.

---

## Important Issues (should fix)

### 1. PowerShell `escapePowershellString` has wrong escape order — backtick must be escaped FIRST

**File:** `src/services/snippet-generators/snippet-escape-utils.ts:27-29`

```ts
// CURRENT (buggy):
return s.replace(/"/g, '`"').replace(/\$/g, '`$').replace(/`/g, '``');
```

The backtick replacement runs LAST, so it double-escapes the backticks already inserted by the `"` and `$` replacements. Input `"hello"` becomes `` `"hello`" `` after step 1, then step 3 turns it into ``` ``"hello``" ``` (wrong).

**Fix:** Escape backticks first, then `"` and `$`:
```ts
return s.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
```

**Impact:** All PowerShell snippets with double quotes or dollar signs in header values/body produce broken syntax.

### 2. PowerShell generator uses `escapeShellArg` (bash single-quote escaping) for values — should use PowerShell escaping

**File:** `src/services/snippet-generators/generator-powershell.ts:24,29`

The generator uses `escapeShellArg()` (bash `'\\''` quoting) for `$body` and `-Uri` values, but PowerShell uses different single-quote escaping (`''` to embed a literal `'`). The `escapePowershellString` utility exists but is unused.

**Fix:** Either use `escapePowershellString` with double-quoted strings, or create a dedicated PowerShell single-quote escape (`s.replace(/'/g, "''")`).

### 3. Python generator: `json.loads()` + `json=` is double-parsing — fragile

**File:** `src/services/snippet-generators/generator-python-requests.ts:29`

```ts
args.push(`json=json.loads('${escapePythonString(req.body!)}')`);
```

This generates `json=json.loads('{"key":"value"}')`, which parses the string at runtime into a dict, then `requests` re-serializes it. This works but is fragile — if the body has single quotes, the Python string breaks even with escaping (nested JSON with `'` in string values). Also imports `json` unnecessarily.

**Better approach:** Use `data=` with the raw string and keep the Content-Type header, or pass the body directly:
```python
response = requests.post(url, data='{"key":"value"}', headers=headers)
```

### 4. Markdown export body block always uses ` ```json ` — incorrect for non-JSON body types

**File:** `src/services/docs-export-service.ts:91`

```ts
lines.push('```json');
```

When `body.type` is `xml`, `raw`, or `form`, the code block still uses `json` syntax highlighting.

**Fix:**
```ts
const lang = req.body.type === 'json' ? 'json' : req.body.type === 'xml' ? 'xml' : '';
lines.push(`\`\`\`${lang}`);
```

### 5. HTML export does not escape table cell content containing `|`

**File:** `src/services/docs-export-service.ts:179`

Markdown table cells split on `|`. If a header value or param value contains `|`, the table will produce extra columns. The `escapeHtml` runs after the split, so it doesn't help.

**Impact:** Rare but possible — API keys or URLs containing `|` break the exported HTML table layout.

---

## Minor Issues (nice to fix)

### 6. `code-snippet-panel.tsx` only loads JS CodeMirror language extension — all other languages render as plain text

**File:** `src/components/request/code-snippet-panel.tsx:54-60`

Only `javascript()` is loaded; Python, Go, Rust, shell, etc. all get no syntax highlighting. This is intentional (comment says "only load JS since it's already available"), but the `codemirrorMode` field in `SNIPPET_LANGUAGES` is misleading — suggests future multi-language support.

**Suggestion:** Add a comment to `SNIPPET_LANGUAGES` noting that `codemirrorMode` is reserved for future use, or lazy-load a few key languages (python, shell) which are lightweight.

### 7. `DocsViewerPage` loads ALL requests and folders into memory

**File:** `src/components/docs/docs-viewer-page.tsx:24-25`

```ts
const allFolders = useLiveQuery(() => db.folders.toArray(), []);
const allRequests = useLiveQuery(() => db.requests.toArray(), []);
```

Loads every request/folder from IndexedDB, then filters client-side. Fine for small datasets but will degrade with hundreds of requests across many collections.

**Suggestion:** Filter at the Dexie query level:
```ts
const allRequests = useLiveQuery(
  () => effectiveId ? db.requests.where('collection_id').equals(effectiveId).toArray() : [],
  [effectiveId]
);
```

### 8. HTTPie generator body piping drops Content-Type header handling

**File:** `src/services/snippet-generators/generator-httpie.ts:29-35`

When a body is present, the code reconstructs the command but strips the first element (`parts[0]`) and re-joins the rest (`parts.slice(1)`). This works but is fragile — if the header array order changes or Content-Type skipping logic changes, the indexing breaks.

### 9. `escapeHtml` in export service doesn't escape single quotes

**File:** `src/services/docs-export-service.ts:140-142`

Single quotes (`'`) are not escaped. While not strictly required for HTML body content, it can cause issues if the escaped value is ever used inside single-quoted HTML attributes.

### 10. Description editor does not debounce `onChange`

**File:** `src/components/request/request-description-editor.tsx:59`

Every keystroke triggers `onChange` which propagates to the store. For auto-save scenarios this causes high write frequency. A 300ms debounce would reduce IndexedDB writes.

---

## Verified Working (confirmed correct logic)

1. **PreparedRequest type** — Clean, minimal interface. `body` is correctly optional. Headers are `Record<string, string>` — matches all generator expectations.

2. **`prepareRequest()` data flow** — Correctly merges params into URL, interpolates variables, applies auth headers, auto-sets Content-Type when missing. `form-data` throws explicit error (not silently broken).

3. **Generator registry** — All 16 generators registered in `index.ts` barrel. Every key in `SNIPPET_LANGUAGES` has a matching `registerGenerator()` call. `generateSnippet()` returns fallback comment for unknown languages.

4. **cURL generator** — Correctly handles: empty body (no `-d`), GET without `-X`, shell single-quote escaping, multi-line formatting with `\`. Solid.

5. **JavaScript fetch generator** — Simple GET produces minimal code. Correctly handles method/headers/body options object construction. Uses `escapeJsString` properly.

6. **Go generator** — Backtick raw string for body with embedded backtick escaping (`+ "`" +`). Correct `http.NewRequest` nil body for bodyless requests. Headers set correctly.

7. **Rust reqwest generator** — Proper method chaining, `.await?` for async. Clean and idiomatic.

8. **CodeSnippetPanel UI** — Correct CodeMirror lifecycle: creates on lang change, dispatches doc update on snippet change. Prevents stacked editors via `innerHTML = ''`. Language persisted in localStorage. Copy uses clipboard API with fallback toast.

9. **DocsRequestCard** — Correctly filters enabled headers/params, renders Markdown description, handles auth display, body preview with `<pre>`.

10. **DocsTableOfContents** — Recursive tree rendering, smooth scroll with `scrollIntoView`, method abbreviation badges.

11. **HTML export** — Self-contained with inline CSS, dark theme matching app design, print media query for light backgrounds. `simpleMarkdownToHtml` handles headings, tables, code blocks, bold, inline code.

12. **Type safety** — Zero `any` types across all reviewed files. All generators use typed `PreparedRequest`. `tsc --noEmit` passes clean.

13. **Barrel exports** — Side-effect imports in `index.ts` ensure all generators auto-register. Re-exports only the public API surface.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 5 |
| Minor | 5 |

**Overall assessment:** Solid implementation with clean architecture. The registry pattern is well-designed and extensible. The two PowerShell escaping bugs (#1, #2) are the most impactful — they produce broken output for that language. The Python json.loads pattern (#3) is fragile but functional. The export markdown language tag (#4) is a correctness issue that affects output quality.

The data flow `ApiRequest -> prepareRequest() -> PreparedRequest -> generateSnippet() -> string` is clean and verified working end-to-end.

---

## Recommended Action Priority

1. Fix PowerShell escape order (bug #1) — 1 line change
2. Fix PowerShell single-quote escaping (bug #2) — small refactor
3. Fix Markdown export body language tag (bug #4) — 2 line change
4. Consider simplifying Python JSON body handling (bug #3)
5. Add Dexie query filtering for DocsViewerPage (perf, #7)
