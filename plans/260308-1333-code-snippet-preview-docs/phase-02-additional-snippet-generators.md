# Phase 02 — Additional Snippet Generators

## Overview
- **Priority:** P2
- **Status:** Complete
- **Effort:** 3h
- Add remaining 13 language generators using same pattern from Phase 1

## Requirements

### Languages to implement

| # | Key | Label | Mode |
|---|-----|-------|------|
| 1 | `javascript-axios` | JavaScript - axios | javascript |
| 2 | `go-native` | Go - net/http | go |
| 3 | `java-httpurlconnection` | Java - HttpURLConnection | java |
| 4 | `java-okhttp` | Java - OkHttp | java |
| 5 | `php-curl` | PHP - cURL | php |
| 6 | `csharp-httpclient` | C# - HttpClient | clike |
| 7 | `ruby-net-http` | Ruby - Net::HTTP | ruby |
| 8 | `swift-urlsession` | Swift - URLSession | swift |
| 9 | `kotlin-okhttp` | Kotlin - OkHttp | kotlin |
| 10 | `dart-http` | Dart - http | dart |
| 11 | `rust-reqwest` | Rust - reqwest | rust |
| 12 | `powershell` | PowerShell | powershell |
| 13 | `httpie` | HTTPie | shell |

## Related Code Files
- **Create:** 13 files in `src/services/snippet-generators/generator-{lang}.ts`
- **Modify:** `snippet-generator-registry.ts` — import + register each new generator

## Implementation Steps

1. For each language, create `generator-{key}.ts` following same pattern:
   - Export function: `(PreparedRequest) => string`
   - Handle: method, url, headers, body (optional)
   - Proper escaping for target language
   - Idiomatic code style for each language
2. Register all in `snippet-generator-registry.ts`
3. Write unit tests for each generator (at least GET + POST-with-body)

## Todo List
- [x] generator-javascript-axios.ts
- [x] generator-go-native.ts
- [x] generator-java-httpurlconnection.ts
- [x] generator-java-okhttp.ts
- [x] generator-php-curl.ts
- [x] generator-csharp-httpclient.ts
- [x] generator-ruby-net-http.ts
- [x] generator-swift-urlsession.ts
- [x] generator-kotlin-okhttp.ts
- [x] generator-dart-http.ts
- [x] generator-rust-reqwest.ts
- [x] generator-powershell.ts
- [x] generator-httpie.ts
- [x] Register all generators in registry
- [x] Unit tests for all generators

## Success Criteria
- All 16 generators (3 core + 13 additional) registered and working
- Each generates syntactically valid code for target language
- `pnpm type-check` and `pnpm test` pass

## Risk Assessment
- **Medium**: Volume of generators — each is mechanical but needs language-specific knowledge
- Mitigation: Each generator is independent, can be added incrementally
