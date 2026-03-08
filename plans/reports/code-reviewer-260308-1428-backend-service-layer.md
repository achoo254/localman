# Code Review: Backend/Service Layer — Code Snippet, Preview & API Docs

**Reviewer:** code-reviewer
**Date:** 2026-03-08
**Scope:** Snippet generators (16 files), docs-export-service, database.ts diff, models.ts diff
**LOC reviewed:** ~943 (services) + diffs

## Overall Assessment

Solid plugin-based architecture. Clean separation of concerns. Each generator is small (<50 lines), consistent in structure, and the registry pattern is well-executed. However, there are **security issues in string interpolation** across almost every generator that must be addressed before merge.

---

## Critical Issues

### 1. No escaping of user input in generated snippets — injection risk in 14/16 generators

Almost every generator directly interpolates `req.url`, `req.body`, header keys/values into string templates without escaping for the target language. Only `generator-curl.ts` escapes single quotes.

**Examples:**
- **JS fetch** (line 14): `'${req.url}'` — a URL containing `'` breaks the snippet and could inject arbitrary JS
- **Python** (line 15): `'${req.url}'` — same issue with single quotes
- **Go** (line 18): `"${req.url}"` — a URL with `"` or backticks in body (line 17: `` `${req.body}` ``) breaks Go raw strings if body contains backticks
- **Java** (line 26): `"${req.body?.replace(/"/g, '\\"')}"` — body is escaped but URL/headers are not
- **Swift/Kotlin/Rust/C#**: Same pattern — body sometimes escaped, URL/headers never

**Impact:** Broken snippets for edge-case inputs. Not a direct XSS risk since snippets render in CodeMirror (text mode), but **users copy-pasting broken snippets could execute unintended commands** (especially cURL, PowerShell, HTTPie which are shell commands).

**Fix:** Each generator needs a language-appropriate escape function applied to all user inputs:
- Shell: escape single quotes (cURL already does this, but HTTPie/PowerShell do not)
- JS/Python/Dart/Ruby: escape single quotes in single-quoted strings
- Java/Go/Swift/Kotlin/Rust/C#: escape double quotes in double-quoted strings
- Go: handle backticks in raw strings (use `"` + `\` escaping instead of backtick literals)

### 2. docs-export-service.ts: XSS in HTML export via `collection.description`

File: `src/services/docs-export-service.ts`, line 18-19:
```typescript
if (collection.description) {
    lines.push('', collection.description);
}
```

The description is pushed raw into markdown, then `simpleMarkdownToHtml` processes it. The `inlineFormat` function calls `escapeHtml` first (line 206), so **inline text is safe**. However, if description contains raw HTML or markdown code blocks, the `simpleMarkdownToHtml` parser does NOT handle all edge cases:
- A description like `` ``` `` (unclosed code block) will leave `inCodeBlock=true` and swallow all subsequent content
- Multi-line descriptions with `|` at line start will be parsed as tables

**Severity:** Medium-Critical. The HTML is exported as a file (not rendered in-app via `dangerouslySetInnerHTML`), so XSS risk is limited to the exported standalone HTML file opened in a browser. But it's still a vector.

**Fix:** Sanitize or escape description before inserting into markdown pipeline, or validate markdown structure.

---

## Important Issues

### 3. HTTPie generator: dead code path and broken logic

File: `generator-httpie.ts`, lines 28-36. When body exists:
- Lines 31-32 build `parts` array with URL and headers, but then the function returns a completely different string (line 32/35), ignoring the `parts` array built on lines 12-25.
- The `parts.unshift('echo')` on line 31 is dead code — the function returns before reaching lines 39-40.
- Both JSON and non-JSON body paths produce nearly identical output (lines 32 vs 35), violating DRY.

**Fix:** Consolidate the body handling. Use `parts` array consistently or build the pipe string from shared helpers.

### 4. JS fetch: JSON body double-serialization

File: `generator-javascript-fetch.ts`, line 29:
```typescript
opts.push(`  body: ${isJson ? `JSON.stringify(${req.body})` : `'${req.body}'`}`);
```

If `req.body` is already a JSON string like `{"name":"test"}`, the generated code is:
```javascript
body: JSON.stringify({"name":"test"})
```

This works **only if** the body is valid JSON. If it's a string with quotes or special chars, it produces invalid JS. The `PreparedRequest.body` is a string, so wrapping it in `JSON.stringify()` without quoting it as a string literal is dangerous.

**Fix:** Either quote it as a string literal: `JSON.stringify('${escaped_body}')` or just pass it as-is since it's already JSON: `body: '${escaped_body}'`.

### 5. Python requests: JSON body injection

File: `generator-python-requests.ts`, line 26:
```typescript
args.push(`json=${req.body}`);
```

If `req.body` = `{"key": "value"}`, output is `json={"key": "value"}` which is valid Python dict literal. But if body contains Python-breaking chars or is malformed JSON, this produces a syntax error. Should use a raw string approach.

**Fix:** Use `json='${escaped}'` and let user parse, or document that body must be valid JSON for this to work.

### 6. C# HttpClient: DELETE/PATCH with body uses wrong method

File: `generator-csharp-httpclient.ts`, line 26. `DeleteAsync` does not accept a content parameter in .NET standard API. Only `PostAsync`, `PutAsync`, `PatchAsync` accept content. For DELETE with body, must use `SendAsync` with `HttpRequestMessage`.

**Fix:** Update `methodToCsharp` to return `SendAsync` for DELETE when body is present, or use `HttpRequestMessage` pattern.

### 7. docs-export-service.ts exceeds 200 lines (209 lines)

Per project rules, files should stay under 200 lines. Could extract `simpleMarkdownToHtml` + `inlineFormat` + `escapeHtml` into a separate `markdown-to-html-converter.ts` utility.

---

## Minor Issues

### 8. Inconsistent body escaping across generators

Some generators escape `"` in body (Java, Swift, Kotlin, Rust, C#), others don't (Python, Dart, Ruby, Go). No generator escapes header values. This inconsistency suggests there's no shared utility — consider a common `escapeForLang(s, quote)` helper.

### 9. Axios generator: missing import statement in output

The generated snippet uses `axios` but doesn't include `import axios from 'axios'`. Minor since users know they need to import, but cURL and Python generators include their imports.

### 10. Database version bump is correct but minimal

`this.version(2).stores({})` is the correct Dexie pattern for schema-compatible changes (adding optional field). No issues here. The comment is clear. Good.

### 11. Lint warning in code-snippet-panel.tsx

ESLint reports unnecessary dependency `activeEnvId` in useMemo. Not in my review scope (UI file), but noting it since it references the snippet service layer.

---

## Positive Observations

- **Plugin architecture** is excellent — adding a new language is trivial (one file + one import)
- **File naming** follows kebab-case convention consistently
- **File sizes** are well within 200-line limit (all generators 33-50 lines)
- **Registry pattern** with `Map<string, SnippetGenerator>` is clean and type-safe
- **Barrel export** in `index.ts` keeps consumer imports clean
- **TypeScript types** are correct — `PreparedRequest` is a simple, well-defined interface
- **Type-check passes** with zero errors
- **DB migration** is handled correctly with Dexie versioning
- **HTML export** has proper `escapeHtml` for the title and inline content
- **Dark theme CSS** in HTML export matches project design system

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | Pass (tsc --noEmit clean) |
| Lint Issues | 1 warning in code-snippet-panel.tsx (out of scope) |
| File Count | 18 new + 2 modified |
| Avg File Size | 41 lines |
| Max File Size | 209 lines (docs-export-service.ts — slightly over limit) |

## Recommended Actions (Priority Order)

1. **[Critical]** Add per-language input escaping to all generators — at minimum escape quote chars in URL, headers, body
2. **[Critical]** Fix HTTPie generator dead code / broken body handling
3. **[Important]** Fix JS fetch JSON.stringify double-serialization bug
4. **[Important]** Fix C# DeleteAsync body handling
5. **[Important]** Extract markdown-to-HTML converter to stay under 200-line limit
6. **[Minor]** Add `import axios` to axios generator output
7. **[Minor]** Create shared `escapeForQuote(s, quoteChar)` utility to DRY up escaping

## Unresolved Questions

- Is `PreparedRequest.body` always a raw string, or can it be a parsed JSON object? The Python and JS fetch generators treat it as both. Need to verify the contract from `prepareRequest()`.
- Are header values guaranteed to be strings, or could they be arrays (e.g., multiple Set-Cookie)? `Record<string, string>` suggests single values only — if arrays are possible upstream, generators will break.
