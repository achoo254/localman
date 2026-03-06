# Phase 03 — Request Builder

## Context
- [requirement.md Section 4.1](../../requirement.md) — Request Builder features
- Depends on: Phase 01, Phase 02

## Overview
- **Priority:** P1
- **Status:** pending
- **Estimate:** 5 days
- **Description:** Full request builder UI — method selector, URL bar, params/headers/body/auth tabs with key-value editors and CodeMirror for body.

## Key Insights
- URL bar is the hero element — large, always visible
- Params/Headers use a key-value table editor (enable/disable per row)
- Body tab needs mode switcher: JSON, Form Data, Multipart, Raw, XML, Binary
- Auth tab: No Auth, Bearer, Basic, API Key (OAuth 2.0 deferred to Phase 2)
- Auto-sync URL query params with Params tab bidirectionally
- CodeMirror 6 for JSON/XML/Raw body editing with syntax highlighting

## Requirements

### Functional
- Method dropdown (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) with color coding
- URL input with variable highlight (`{{var}}` shown in accent color)
- Params tab: key-value table, toggle per row, auto-sync with URL query string
- Headers tab: key-value table, auto-suggest common headers
- Body tab: JSON (CodeMirror), Form Data (key-value), Raw text, XML, Binary (file picker)
- Auth tab: None, Bearer Token, Basic Auth, API Key (header/query)
- Send button (Ctrl+Enter shortcut)
- Tab system for multiple open requests

### Non-Functional
- Key-value editor handles 100+ rows smoothly
- CodeMirror loads < 200ms
- Variable highlights update in real-time

## Architecture

### Component Tree
```
<RequestPanel>
  <UrlBar method={} url={} onSend={} />
  <RequestTabs>
    <ParamsTab pairs={} onChange={} />
    <HeadersTab pairs={} onChange={} />
    <BodyTab body={} onChange={} />
    <AuthTab auth={} onChange={} />
    <PreScriptTab script={} onChange={} />  // wired in Phase 09
    <PostScriptTab script={} onChange={} /> // wired in Phase 09
  </RequestTabs>
</RequestPanel>
```

### Zustand Store — `request-store.ts`
```typescript
interface RequestStore {
  // Active tab management
  openTabs: TabInfo[];
  activeTabId: string | null;

  // Current request being edited
  activeRequest: ApiRequest | null;
  isDirty: boolean;

  // Actions
  openRequest: (id: string) => void;
  closeTab: (id: string) => void;
  updateActiveRequest: (partial: Partial<ApiRequest>) => void;
  createNewRequest: (collectionId?: string) => void;
  saveRequest: () => void;  // debounced auto-save
}
```

### Key-Value Editor (reusable)
Shared between Params, Headers, Form Data:
- Columns: checkbox (enable), key input, value input, description, delete button
- Auto-add empty row at bottom
- Bulk edit mode (raw text: `key: value` per line)

## Related Code Files

### Create
- `src/components/request/request-panel.tsx` — Main request panel container
- `src/components/request/url-bar.tsx` — Method selector + URL input + Send btn
- `src/components/request/method-selector.tsx` — Dropdown with colored methods
- `src/components/request/request-tabs.tsx` — Tab container (Radix Tabs)
- `src/components/request/params-tab.tsx` — Query params editor
- `src/components/request/headers-tab.tsx` — Headers editor with auto-suggest
- `src/components/request/body-tab.tsx` — Body mode switcher + editors
- `src/components/request/body-json-editor.tsx` — CodeMirror JSON editor
- `src/components/request/body-form-editor.tsx` — Form data key-value
- `src/components/request/body-raw-editor.tsx` — CodeMirror raw/XML editor
- `src/components/request/body-binary-picker.tsx` — File picker for binary
- `src/components/request/auth-tab.tsx` — Auth type switcher + forms
- `src/components/common/key-value-editor.tsx` — Reusable KV table
- `src/components/common/variable-highlight-input.tsx` — Input with {{var}} highlight
- `src/stores/request-store.ts` — Zustand store for active request
- `src/hooks/use-auto-save.ts` — Debounced auto-save hook

## Implementation Steps

1. **Create Zustand request store**
   - Tab management (open, close, switch)
   - Active request state
   - Auto-save with 300ms debounce via `requestService.update()`

2. **Build key-value editor component**
   - Generic, reusable for params/headers/form data
   - Enable/disable toggle per row
   - Auto-add empty row
   - Delete row button
   - Bulk edit toggle (textarea mode)

3. **Build variable highlight input**
   - Detect `{{variableName}}` pattern
   - Render highlighted spans within input
   - Can use contentEditable div or overlay approach

4. **Build URL bar**
   - Method selector dropdown (Radix Select) with method colors
   - URL input with variable highlighting
   - Send button (primary accent color)
   - Ctrl+Enter keyboard shortcut

5. **Build params tab**
   - Key-value editor
   - Bidirectional sync with URL query string
   - Parse URL -> populate params, edit params -> update URL

6. **Build headers tab**
   - Key-value editor
   - Auto-suggest for common headers (Content-Type, Authorization, Accept, etc.)
   - Show auto-generated headers (grayed out)

7. **Build body tab**
   - Mode selector: none, JSON, form-data, x-www-form-urlencoded, raw, XML, binary
   - JSON mode: CodeMirror 6 with JSON language support
   - Form data / urlencoded: key-value editor
   - Raw/XML: CodeMirror with appropriate language
   - Binary: native file picker (Tauri dialog)
   - Disable body for GET/HEAD/OPTIONS methods

8. **Build auth tab**
   - Type selector: No Auth, Bearer Token, Basic Auth, API Key
   - Bearer: single token input
   - Basic: username + password inputs
   - API Key: key name + value + location (header/query)

9. **Build request tabs container**
   - Radix Tabs: Params, Headers, Body, Auth, Pre-Script, Post-Script
   - Badge showing count of active items per tab

10. **Build request panel**
    - Compose URL bar + tabs
    - Connect to Zustand store

11. **Build tab bar for multiple requests**
    - Horizontal tabs showing request name + method color
    - Close button per tab
    - Dirty indicator (dot)

## Todo List
- [ ] Create request Zustand store
- [ ] Build key-value editor component
- [ ] Build variable highlight input
- [ ] Build URL bar (method + URL + send)
- [ ] Build params tab with URL sync
- [ ] Build headers tab with auto-suggest
- [ ] Build body tab (JSON/Form/Raw/XML/Binary)
- [ ] Setup CodeMirror 6 for JSON/Raw editing
- [ ] Build auth tab (Bearer/Basic/API Key)
- [ ] Build request tabs container
- [ ] Build request tab bar (multiple open requests)
- [ ] Implement auto-save hook
- [ ] Wire to Dexie DB services

## Success Criteria
- All HTTP methods selectable with correct colors
- URL params sync bidirectionally with Params tab
- CodeMirror renders JSON with syntax highlighting
- Auth tab generates correct headers
- Auto-save persists changes to IndexedDB
- Multiple request tabs work

## Risk Assessment
- CodeMirror 6 bundle size — use dynamic import to lazy-load
- Variable highlight in input — contentEditable can be tricky, consider overlay div approach
- URL-params sync can create infinite loops — use a flag to skip sync during programmatic updates

## Next Steps
- Phase 04: HTTP Client + Response Viewer
