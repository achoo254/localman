# Phase 08 — Import/Export

## Context
- [Postman Collection v2.1 schema](https://schema.getpostman.com/)
- [requirement.md Section 4.3](../../requirement.md) — Import/Export
- Depends on: Phase 02, Phase 05

## Overview
- **Priority:** P2
- **Status:** pending
- **Estimate:** 4 days
- **Description:** Import from cURL commands and Postman Collection v2.1 format. Export to JSON (native format), cURL, and Postman-compatible format.

## Key Insights
- cURL import is highest priority — developers copy cURL from browser DevTools constantly
- Postman Collection v2.1 is the most common collection format
- OpenAPI 3.0 import deferred to Phase 2 (complex, lower priority)
- Native export format should be a clean JSON that can roundtrip
- Tauri file dialogs for open/save

## Requirements

### Functional

**Import:**
- cURL command -> single request (parse method, URL, headers, body, auth)
- Postman Collection v2.1 JSON -> collection with folders and requests
- Native Localman JSON -> full restore
- Drag-and-drop file onto app to import

**Export:**
- Single request -> cURL command (copy to clipboard)
- Collection -> native JSON file
- Collection -> Postman Collection v2.1 JSON (for interop)
- Full data backup -> JSON (all collections, envs, settings)

### Non-Functional
- Import 1000-request Postman collection < 5s
- cURL parse handles edge cases (multiline, special chars)

## Architecture

### cURL Parser
```typescript
// src/services/importers/curl-parser.ts
function parseCurl(curlCommand: string): Partial<ApiRequest> {
  // Handle: curl -X POST -H "Content-Type: application/json" -d '{"key":"val"}' https://api.example.com
  // Extract: method, url, headers, body, auth (if -u flag)
}
```

### Postman Collection v2.1 Mapper
```typescript
// src/services/importers/postman-importer.ts
interface PostmanCollection {
  info: { name: string; schema: string; };
  item: PostmanItem[];       // recursive (items can contain items = folders)
  variable?: PostmanVar[];   // collection variables
}

function importPostmanCollection(json: PostmanCollection): {
  collection: Collection;
  folders: Folder[];
  requests: ApiRequest[];
}
```

### Export Service
```typescript
// src/services/exporters/
function exportToCurl(request: ApiRequest, context: InterpolationContext): string
function exportToNativeJson(collectionId: string): NativeExportData
function exportToPostman(collectionId: string): PostmanCollection
function exportFullBackup(): FullBackupData
```

## Related Code Files

### Create
- `src/services/importers/curl-parser.ts` — cURL command parser
- `src/services/importers/postman-importer.ts` — Postman v2.1 collection importer
- `src/services/importers/native-importer.ts` — Localman JSON importer
- `src/services/exporters/curl-exporter.ts` — Generate cURL from request
- `src/services/exporters/native-exporter.ts` — Localman JSON export
- `src/services/exporters/postman-exporter.ts` — Postman v2.1 export
- `src/services/import-export-service.ts` — Orchestrator (file dialogs, format detection)
- `src/components/import-export/import-dialog.tsx` — Import UI (file picker + paste cURL)
- `src/components/import-export/export-dialog.tsx` — Export format selector

### Modify
- `src/components/collections/collection-context-menu.tsx` — Add export options
- `src/components/layout/titlebar.tsx` — Add import button/menu

## Implementation Steps

1. **Build cURL parser**
   - Tokenize cURL command (handle quotes, escapes, line continuations `\`)
   - Extract flags: `-X` (method), `-H` (headers), `-d`/`--data` (body), `-u` (basic auth)
   - Handle `--data-raw`, `--data-binary`, `--data-urlencode`
   - Default method: GET (or POST if body present)
   - Parse URL (last non-flag argument)
   - Unit test with common cURL patterns from browser DevTools

2. **Build Postman Collection v2.1 importer**
   - Parse `item` array recursively (items with `item` children = folders)
   - Map `request.method`, `request.url`, `request.header`, `request.body`
   - Map `request.auth` (bearer, basic, apikey)
   - Map `request.body.mode` (raw, urlencoded, formdata, file)
   - Handle collection variables -> create environment
   - Generate UUIDs for all entities, set sort_order

3. **Build native JSON importer**
   - Validate schema version
   - Bulk insert collections, folders, requests, environments
   - Handle ID conflicts (regenerate IDs on import)

4. **Build cURL exporter**
   - Generate valid cURL command from request
   - Include: method, URL, headers, body, auth
   - Properly escape shell special characters
   - Copy to clipboard action

5. **Build native JSON exporter**
   - Export single collection (with folders + requests)
   - Export full backup (all data)
   - Include schema version for forward compat

6. **Build Postman exporter**
   - Map Localman models back to Postman v2.1 format
   - Reconstruct nested `item` array from folders
   - Set `info.schema` to Postman v2.1 URL

7. **Build import dialog**
   - Tab: "File" (drag-drop zone + file picker) | "cURL" (paste textarea)
   - File: auto-detect format (Postman vs Localman)
   - Preview: show what will be imported (collection name, request count)
   - "Import" button

8. **Build export dialog**
   - Select format: Localman JSON, Postman v2.1, cURL (per request)
   - Tauri save dialog for file exports

9. **Integrate into UI**
   - Import button in titlebar (or menu)
   - Export in collection context menu
   - "Copy as cURL" in request context menu

## Todo List
- [ ] Build cURL parser with tests
- [ ] Build Postman Collection v2.1 importer
- [ ] Build native JSON importer
- [ ] Build cURL exporter
- [ ] Build native JSON exporter
- [ ] Build Postman v2.1 exporter
- [ ] Build import dialog UI
- [ ] Build export dialog UI
- [ ] Integrate import/export into menus
- [ ] Test with real Postman collection files

## Success Criteria
- cURL from Chrome DevTools imports correctly
- Postman Collection v2.1 imports with folders, requests, auth, variables
- Export -> import roundtrip preserves all data
- "Copy as cURL" generates valid command

## Risk Assessment
- cURL parser edge cases: multiline, environment variable in cURL, binary data — handle common cases, show error for unsupported
- Postman Collection format variations — validate against official schema, graceful fallback for unknown fields
- Large collection imports — use Dexie transaction for atomicity, show progress bar

## Next Steps
- Phase 09: Scripts Sandbox
