# Project Changelog

All notable changes to Localman documented here. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Phase 12] — 2026-03-08

### Added
- **Draft Tab System** — Transient in-memory request drafts (not persisted until explicit save)
  - Ctrl+T creates new blank draft tab
  - Draft tabs display italic styling to indicate unsaved state
  - Ctrl+S opens save dialog to persist draft to collection
  - Draft state tracked via `TabInfo.isDraft` boolean flag
  - In-memory `drafts` record in `useRequestStore` holds unpersisted data

- **Draft Pre-filling** — Context menu creates drafts with parent collection/folder info
  - "New Request" sidebar context menu pre-fills `prefillCollectionId` and `prefillFolderId`
  - Save dialog suggests pre-selected collection/folder
  - Simplifies workflow for organizing requests by folder

- **Auto-save & History Exclusion for Drafts**
  - Auto-save skipped for drafts (300ms debounce bypassed via `isDraft` flag)
  - History not logged for draft executions (prevents clutter in history viewer)
  - Clean memory after save via `drafts` record cleanup

- **Save Dialog** (`save-request-dialog.tsx`)
  - Collection/folder selector with tree view
  - Request name input with draft name pre-fill
  - Async save with DB persistence and UI update

### Modified
- `src/stores/request-store.ts` — added draft management (drafts record, createDraftTab, saveDraftToCollection)
- `src/hooks/use-auto-save.ts` — check `isDraft` flag, skip save if draft
- `src/stores/response-store.ts` — skip history if request id starts with `draft_`
- `src/components/request/request-panel.tsx` — integrate save dialog
- `src/components/request/request-tab-bar.tsx` — italic styling for draft tabs
- `src/components/request/url-bar.tsx` — Ctrl+S trigger for save dialog
- `src/components/collections/sidebar-tabs.tsx` — "New Request" context menu with prefill
- `src/App.tsx` — global Ctrl+T handler for new draft tab

## [Phase 11] — 2026-03-08

### Added
- **Code Snippet Generation** — 16 language generators (cURL, JavaScript fetch/axios, Python, Go, Java, PHP, C#, Ruby, Swift, Kotlin, Dart, Rust, PowerShell, HTTPie)
  - Syntax-highlighted read-only display via CodeMirror
  - Language selector dropdown with last-selected persistence
  - Copy-to-clipboard functionality with toast feedback
  - Auto-regenerates when request/environment changes
  - Lazy-loaded UI panel to minimize bundle impact

- **API Documentation Features**
  - `description?: string` field on `ApiRequest` type
  - Markdown editor/preview for request descriptions (collapsible)
  - Docs viewer page with full collection hierarchy display
  - Table of contents with anchor link navigation
  - Request cards showing method, URL, description, headers, params, auth type
  - HTML export with inline CSS (standalone, print-friendly)
  - Markdown export for docs portability
  - Tauri save dialog for file export

- **Dependencies**
  - `react-markdown` for markdown rendering in docs

### Modified
- `src/types/models.ts` — added `description?: string` to `ApiRequest`
- `src/db/database.ts` — bumped Dexie version for schema update
- `src/components/request/url-bar.tsx` — added `</>` toggle button for snippet panel
- `src/components/request/request-panel.tsx` — integrated snippet panel + description editor
- `src/components/collections/sidebar-tabs.tsx` — added "Docs" tab alongside Collections/Environments/History
- `package.json` — added `react-markdown` dependency

### Files Created
- `src/services/snippet-generators/snippet-generator-registry.ts` — registry, types, language metadata
- `src/services/snippet-generators/generator-curl.ts` — cURL generator
- `src/services/snippet-generators/generator-javascript-fetch.ts` — JS fetch generator
- `src/services/snippet-generators/generator-javascript-axios.ts` — JS axios generator
- `src/services/snippet-generators/generator-python-requests.ts` — Python generator
- `src/services/snippet-generators/generator-go-native.ts` — Go net/http generator
- `src/services/snippet-generators/generator-java-httpurlconnection.ts` — Java HTTPURLConnection generator
- `src/services/snippet-generators/generator-java-okhttp.ts` — Java OkHttp generator
- `src/services/snippet-generators/generator-php-curl.ts` — PHP cURL generator
- `src/services/snippet-generators/generator-csharp-httpclient.ts` — C# HttpClient generator
- `src/services/snippet-generators/generator-ruby-net-http.ts` — Ruby Net::HTTP generator
- `src/services/snippet-generators/generator-swift-urlsession.ts` — Swift URLSession generator
- `src/services/snippet-generators/generator-kotlin-okhttp.ts` — Kotlin OkHttp generator
- `src/services/snippet-generators/generator-dart-http.ts` — Dart http generator
- `src/services/snippet-generators/generator-rust-reqwest.ts` — Rust reqwest generator
- `src/services/snippet-generators/generator-powershell.ts` — PowerShell generator
- `src/services/snippet-generators/generator-httpie.ts` — HTTPie generator
- `src/services/snippet-generators/index.ts` — barrel export
- `src/services/docs-export-service.ts` — HTML/Markdown export functions
- `src/components/request/code-snippet-panel.tsx` — snippet UI panel with language selector
- `src/components/request/request-description-editor.tsx` — markdown description editor/preview
- `src/components/docs/docs-viewer-page.tsx` — API docs viewer page
- `src/components/docs/docs-request-card.tsx` — individual request documentation card
- `src/components/docs/docs-table-of-contents.tsx` — table of contents sidebar

## [Phase 10] — 2026-02-XX

(Earlier phases documented in their respective plan files)

## Unresolved Questions

None at this time.
