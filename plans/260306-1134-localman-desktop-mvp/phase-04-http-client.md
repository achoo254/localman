# Phase 04 — HTTP Client & Response Viewer

## Context
- [Tauri HTTP plugin](https://tauri.app/plugin/http-client/)
- [requirement.md Section 4.2](../../requirement.md) — Response Viewer
- Depends on: Phase 01, Phase 02, Phase 03

## Overview
- **Priority:** P1
- **Status:** pending
- **Estimate:** 4 days
- **Description:** Execute HTTP requests via Tauri native HTTP plugin (bypasses CORS), display responses with JSON syntax highlighting, headers, cookies, timing info.

## Key Insights
- Tauri v2 `tauri-plugin-http` wraps Rust's `reqwest` — full HTTP client, no CORS
- Invoke via `@tauri-apps/plugin-http` JS API: `fetch()` function similar to web fetch
- Timing data: Tauri plugin doesn't provide DNS/TCP breakdown — measure total round-trip in JS, detailed timing requires custom Rust command
- Response body can be large — stream or truncate for display (limit to 10MB)
- Auto-log every sent request to history (Phase 07 will wire the UI)

## Requirements

### Functional
- Execute any HTTP method with headers, body, auth
- CORS bypass (all origins work)
- Display: status code (colored badge), response time, response size
- Response body viewer: JSON (syntax highlight + collapsible tree), Raw text, HTML preview
- Response headers table
- Response cookies table
- Copy response body button
- Save response to file
- Cancel in-flight request
- Loading spinner during request

### Non-Functional
- Request execution < 100ms overhead (excluding network)
- JSON highlighting for responses up to 5MB
- No UI freeze during large response parsing

## Architecture

### Request Execution Flow
```
1. User clicks Send / Ctrl+Enter
2. requestStore.setLoading(true)
3. Interpolate variables in URL, headers, body (Phase 06 integration)
4. Apply auth config -> merge into headers
5. Execute pre-request script (Phase 09 integration)
6. Call Tauri HTTP plugin fetch()
7. Capture timing (start/end timestamps)
8. Parse response (status, headers, body, cookies)
9. Execute post-response script (Phase 09 integration)
10. Log to history (auto)
11. Display in response viewer
12. requestStore.setLoading(false)
```

### Tauri HTTP Plugin Usage
```typescript
import { fetch } from '@tauri-apps/plugin-http';

const response = await fetch(url, {
  method,
  headers,
  body: bodyContent,
  // connectTimeout, maxRedirections, etc.
});
```

### Response Store — `response-store.ts`
```typescript
interface ResponseStore {
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;
  abortController: AbortController | null;

  executeRequest: (request: PreparedRequest) => Promise<void>;
  cancelRequest: () => void;
  clearResponse: () => void;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cookies: Cookie[];
  body: string;
  bodySize: number;       // bytes
  responseTime: number;   // ms
  contentType: string;
}
```

## Related Code Files

### Create
- `src/services/http-client.ts` — Request execution via Tauri HTTP plugin
- `src/services/request-preparer.ts` — Interpolate vars, apply auth, build final request
- `src/services/auth-handler.ts` — Generate auth headers from AuthConfig
- `src/stores/response-store.ts` — Response state
- `src/components/response/response-panel.tsx` — Response viewer container
- `src/components/response/response-status-bar.tsx` — Status code + time + size badges
- `src/components/response/response-tabs.tsx` — Body/Headers/Cookies tabs
- `src/components/response/response-body-viewer.tsx` — JSON/Raw/HTML switcher
- `src/components/response/json-viewer.tsx` — Collapsible JSON tree with syntax highlight
- `src/components/response/raw-viewer.tsx` — Plain text display
- `src/components/response/html-preview.tsx` — Sandboxed HTML render
- `src/components/response/response-headers-table.tsx` — Headers key-value display
- `src/components/response/response-cookies-table.tsx` — Cookies table
- `src/components/response/response-actions.tsx` — Copy, save to file buttons

## Implementation Steps

1. **Create HTTP client service**
   - Wrap Tauri `fetch()` with timing measurement
   - Handle all HTTP methods
   - Support request body (JSON, form data, multipart, raw, binary)
   - Parse response headers, extract cookies
   - Calculate body size
   - Abort support via AbortController

2. **Create request preparer service**
   - Apply variable interpolation (stub for Phase 06 — pass-through for now)
   - Apply auth config -> generate Authorization header
   - Merge auto-headers (Content-Type based on body type)
   - Build final URL with query params

3. **Create auth handler**
   - Bearer: `Authorization: Bearer <token>`
   - Basic: `Authorization: Basic <base64(user:pass)>`
   - API Key: add to header or query param based on config

4. **Create response Zustand store**
   - Loading state, response data, error state
   - executeRequest action (calls http-client service)
   - cancelRequest action
   - Auto-log to history service after response

5. **Build response status bar**
   - Status code badge (colored: 2xx=green, 3xx=blue, 4xx=orange, 5xx=red)
   - Response time in ms
   - Response size (formatted: B/KB/MB)

6. **Build JSON viewer**
   - Parse JSON string
   - Recursive tree rendering with collapsible nodes
   - Syntax highlighting (strings=green, numbers=blue, booleans=purple, null=gray, keys=white)
   - Copy node value on click
   - Search within JSON (Ctrl+F)
   - Use virtualized rendering for large payloads (react-window or similar)

7. **Build response body viewer**
   - Tab/toggle: Pretty (JSON tree), Raw, Preview (HTML)
   - Auto-detect content type
   - JSON: show tree viewer
   - HTML: render in sandboxed iframe
   - Other: show raw text with CodeMirror (read-only)

8. **Build response headers & cookies tables**
   - Simple key-value table for headers
   - Cookies: name, value, domain, path, expires, httpOnly, secure

9. **Build response actions**
   - Copy body to clipboard
   - Save body to file (Tauri save dialog)

10. **Integrate with request panel**
    - Send button triggers executeRequest
    - Split pane: request left, response right (resizable)
    - Loading spinner overlay during request

## Todo List
- [ ] Create HTTP client service (Tauri fetch wrapper)
- [ ] Create request preparer (auth, headers, body)
- [ ] Create auth handler service
- [ ] Create response Zustand store
- [ ] Build response status bar (status + time + size)
- [ ] Build JSON viewer (collapsible tree + highlight)
- [ ] Build response body viewer (JSON/Raw/Preview tabs)
- [ ] Build response headers table
- [ ] Build response cookies table
- [ ] Build response action buttons (copy, save)
- [ ] Integrate request + response split pane
- [ ] Handle large responses (truncation/virtualization)
- [ ] Implement request cancellation

## Success Criteria
- GET/POST/PUT/PATCH/DELETE requests work against any URL (no CORS)
- JSON responses display with syntax highlighting and collapsible nodes
- Status code, time, size shown correctly
- Request cancellation works
- Large JSON (5MB) renders without UI freeze

## Risk Assessment
- Tauri HTTP plugin may not expose detailed timing (DNS/TCP/TLS) — show total time for MVP, add Rust-level timing command later
- Large response bodies can freeze UI — use Web Workers for JSON parsing, virtualized list for rendering
- Binary responses (images, files) — show download option, not inline render for MVP

## Security Considerations
- Sanitize HTML preview in sandboxed iframe (prevent XSS)
- Don't execute JavaScript from response bodies
- File save uses Tauri's secure dialog (no arbitrary path access)

## Next Steps
- Phase 05: Collections & Sidebar
