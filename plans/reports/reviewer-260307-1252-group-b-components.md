# Code Review — Group B: UI Components

**Files reviewed:** 37 files across layout, common, request, response, collections, and root entry points
**Total LOC:** ~1,850 (estimated)
**Date:** 2026-03-07

---

## Critical Issues (must fix before next phase)

### Security

- **[html-preview.tsx:10] XSS via unsandboxed iframe — CSS/resource exfiltration risk**
  `sandbox="allow-same-origin"` permits the iframe to access `window.parent`, read cookies via `document.cookie` (same origin), and fire same-origin requests. An API response containing `<script>` tags won't execute, but a page using `fetch` to same-origin endpoints or accessing `localStorage`/`IndexedDB` via `window.parent.postMessage` or direct DOM access can exfiltrate stored data.
  Fix: use `sandbox=""` (empty — no permissions) or at minimum remove `allow-same-origin`. The preview is read-only; no origin access is needed.

### Logic Bugs

- **[request-panel.tsx:60-63] `executeRequest` called without awaiting `saveRequest`**
  `handleSend` calls `await saveRequest()` then calls `executeRequest(activeRequest)` immediately — but `activeRequest` at this point is the *stale* value captured at render time, not the freshly saved one. If `saveRequest` mutates the store, the in-flight request uses old state. Either read from the store after save or pass the updated request explicitly.

- **[response-body-viewer.tsx:26-28] Initial `mode` state doesn't react to `contentType` changes**
  `useState(() => isJsonLike(contentType) ? 'pretty' : ...)` is an initializer — it only runs once. If `contentType` changes between responses (e.g., first call returns JSON, second returns HTML), the mode stays at whatever was set for the first response. The mode should reset when `contentType` changes (use a `useEffect` or derive from props).

- **[sidebar-tabs.tsx:183] Comma operator abuse — silent bug risk**
  `onOpenChange={open => !open && (setCollectionDialog(null), setRenameCollectionId(null))}`
  The comma operator executes both setters but only evaluates to the last one. While this works today, it's fragile: linters may flag it, and adding a third setter is error-prone. Use a proper arrow body or extract a named handler.

---

## Important Issues (should fix soon)

### React Patterns

- **[sidebar-tabs.tsx:47-49] Direct Zustand `getState()` call inside render-time event handler**
  `useRequestStore.getState().createNewRequest(...)` bypasses React's subscription model. Prefer subscribing via the hook at the top of the component (already done for other store actions) for consistency and testability.

- **[sidebar-tabs.tsx:97] Second `getState()` call for `moveRequestToCollection`**
  Same issue as above. `useCollectionsStore.getState().moveRequestToCollection(...)` — subscribe at the hook level instead.

- **[collection-item.tsx:31-52, folder-item.tsx:32-46] Clickable `div` wraps a `button` — double event fire**
  The outer `<div onClick={onToggle}>` and the inner `<button>` both respond to clicks. Clicking the `<button>` fires the `button`'s implicit click handler AND bubbles to the `<div>`. The result is `onToggle` fires twice. The `<button>` has no `onClick` of its own — it is purely decorative. Either remove the outer div's `onClick` and wire it to the button, or make the button `tabIndex={-1}` and stop-propagation. Also: the outer `<div>` should be `role="button"` if it handles clicks, or the whole thing should be a single `<button>`.

- **[body-tab.tsx:58-59] Stale default content substitution**
  `value={body.raw ?? '{\n  \n}'}` — if the user deliberately clears the JSON editor to `""`, the value immediately snaps back to the template. Provide the default only on initial mount (or in the editor init), not as a live prop fallback.

- **[body-json-editor.tsx / body-raw-editor.tsx] Duplicated CodeMirror setup pattern**
  Both files are nearly identical (~55 LOC each). Extract a `useCodeMirror(extensions, initialDoc)` hook or a shared `CodeMirrorEditor` component. DRY violation.

### TypeScript Quality

- **[request-tabs.tsx:18] `includes` on `string[]` with `HttpMethod` — implicit widening**
  `['GET', 'HEAD', 'OPTIONS'].includes(request.method)` — `request.method` is typed as `HttpMethod`. This works at runtime but TypeScript may infer the array as `string[]` and demand a type assertion. Use `as const` + `readonly` tuple for correctness: `(['GET', 'HEAD', 'OPTIONS'] as const).includes(request.method)`.

- **[response-body-viewer.tsx:17-18] Regex content-type matching is too loose**
  `/json|javascript/.test(ct)` matches `application/json`, but also `text/javascript` (not a body format users need to "pretty print") and any content-type containing the word "json" in arbitrary position. Use `ct.includes('application/json') || ct.includes('+json')` for correctness.

- **[method-selector.tsx:16-17] HEAD and OPTIONS share GET's color**
  Mapped to `var(--color-method-get)` with no dedicated token. Same in `request-item.tsx` and `request-tab-bar.tsx`. Minor correctness issue, but these are semantically different methods. Consider dedicated fallback or a neutral color.

- **[response-headers-table.tsx:24] Duplicate header names keyed by name only**
  `key={key}` is fine for most headers, but HTTP allows duplicate header names (e.g., `Set-Cookie`). Keying by name means duplicates silently overwrite each other in React's reconciliation. Key by index or `${key}-${i}`.

- **[response-cookies-table.tsx:27] Index as key for cookies**
  `key={i}` — acceptable here since list doesn't reorder, but fragile. If a cookie name is available (it is: `c.name`), use `key={c.name}` or `key={c.name + i}` for uniqueness.

### Accessibility

- **[collection-item.tsx, folder-item.tsx, request-item.tsx] Clickable `div` not keyboard-accessible**
  `<div onClick={...}>` without `role="button"` and `tabIndex={0}` and `onKeyDown` handler is inaccessible to keyboard users. `FolderItem` and `CollectionItem` row divs have `onClick` but no keyboard support. `RequestItem` has the same issue.

- **[titlebar.tsx:31-48] Window control buttons have no visible icons**
  Minimize/Maximize/Close buttons have `aria-label` (good) but render with zero content — no icon, no text. The buttons are visually invisible boxes that happen to be hoverable. This is a UI rendering bug for users who can see the app.

- **[auth-tab.tsx:43,55,63,75,83] `<label>` not associated with input**
  Labels use adjacent placement but no `htmlFor` / `id` pairing. Screen readers cannot associate them. Add `id` to each input and matching `htmlFor` to each label.

- **[body-tab.tsx:37-51] Auth-type buttons have no `aria-pressed` state**
  The segmented control for body type (and auth type in `auth-tab.tsx`) should communicate selected state via `aria-pressed` on each toggle button.

### Performance

- **[json-viewer.tsx] No virtualization for large JSON**
  Acknowledged in comments ("No virtualization for MVP"). Fine for MVP, but a deeply nested 10MB response body will freeze the UI. Flag for Phase 06+. Consider a size threshold above which the raw view is shown by default.

- **[sidebar-tabs.tsx:160-169] `contextMenuCallbacks` object recreated on every render**
  The object literal at line 101 is created inline on every render pass. Wrap in `useMemo` keyed on the individual stable callbacks to avoid triggering unnecessary re-renders of `CollectionTree` and all child items.

- **[collection-item.tsx / folder-item.tsx] Re-renders on any `expandedIds` Set change**
  Both components subscribe to `expandedIds` (the full Set). Any expand/collapse of any node re-renders all collection and folder items. Each component should only subscribe to the specific boolean it needs (`expandedIds.has(node.id)`), which is already done in `FolderItem` — but `CollectionItem` receives `isExpanded` as a prop from `CollectionTree`, which still subscribes to the full Set. Low impact now, high impact with 100+ nodes.

---

## Minor Issues (nice to have)

- **[create-collection-dialog.tsx / create-folder-dialog.tsx] Near-identical duplicates**
  Both files are 84 lines of functionally identical code differing only in strings ("collection" vs "folder"). Extract a shared `NameInputDialog` component parameterized by entity name.

- **[headers-tab.tsx:8-17] `SUGGESTED_HEADERS` rendered as static text**
  The suggestion list is shown as a non-interactive comma-separated string. It would be more useful as clickable chips that insert the header key into a new row. Current form provides zero UX value — the user must still type it.

- **[status-bar.tsx:12] Hardcoded "DB: ready"**
  Static string serves no function until wired to actual DB state. Should either be wired or removed.

- **[sidebar.tsx:9-11] Sidebar width is fixed, not user-resizable**
  `DEFAULT_WIDTH = 240` with no drag handle. The constants `MIN_WIDTH` / `MAX_WIDTH` are defined but never used in any resize logic — dead code.

- **[body-binary-picker.tsx:17] Silent error swallowed on file dialog cancel vs failure**
  `catch { onSelect(null) }` treats user cancellation (which also throws in Tauri) the same as a real error. This is acceptable but means there's no way to distinguish a failed dialog from intentional dismissal.

- **[response-actions.tsx:21-27] Save error silently swallowed**
  `catch { // Save failed }` with no user feedback. Add a toast or error state.

- **[collection-context-menu.tsx] No "Rename" for requests**
  Request context menu has Duplicate, Move, Delete — but no Rename. Inconsistent with collections and folders.

- **[request-tabs.tsx:83-98] Script tabs use plain `textarea`**
  Pre/Post script tabs use a raw `<textarea>` while body editors use CodeMirror. Inconsistent UX within the same panel. The placeholder text "(Phase 09)" leaks implementation notes into the UI.

- **[App.tsx:1] Mixing named imports from `react-resizable-panels`**
  Imports `Panel`, `Group`, `Separator` — but the library exports `PanelGroup` and `PanelResizeHandle` as canonical names. Verify the import aliases match the installed version to avoid runtime errors if the library updates.

---

## Positives (good patterns worth keeping)

- **`onChangeRef` pattern in CodeMirror editors** — using a ref to hold the latest `onChange` callback avoids stale closure issues inside `EditorView.updateListener`. Correct and idiomatic.
- **`segmentize` in `variable-highlight-input.tsx`** — clean implementation; correctly creates a fresh RegExp instance to avoid `lastIndex` reuse bugs on the module-level `VAR_PATTERN`.
- **`useCallback` on stable handlers** in `KeyValueEditor` — correct deps, prevents child re-renders on parent re-render.
- **`useMemo` on `tryParse` in `JsonViewer`** — correct; JSON parsing is expensive and should not repeat on every render.
- **Radix UI primitives used throughout** — accessible base components for Select, Dialog, Tabs, ContextMenu. Good foundation.
- **Tauri HTTP plugin for requests** — consistent with architectural decision to bypass CORS via native layer.
- **Auto-focus on dialog inputs** — `autoFocus` on name inputs in collection/folder dialogs is correct UX.
- **`void` prefix on fire-and-forget async calls** — seen in `sidebar.tsx:17`. Correct pattern to signal intentional unhandled promise.

---

## Summary

The codebase is well-structured and readable for an MVP. The component decomposition is appropriate and follows single-responsibility reasonably well. The critical `allow-same-origin` sandbox on the HTML preview is a security gap that must be closed before any real use. The stale `activeRequest` in `handleSend` is a functional bug that could cause requests to be sent with wrong data. Several accessibility gaps (unassociated labels, non-keyboard-navigable clickable divs, empty window control buttons) should be addressed before any user-facing release. Two DRY violations (CodeMirror editors, collection/folder dialogs) add maintenance burden but are low risk.

---

## Unresolved Questions

1. Are the `MIN_WIDTH`/`MAX_WIDTH` constants in `sidebar.tsx` placeholders for a future resizable sidebar, or dead code to remove?
2. Is `allow-same-origin` on the HTML preview intentional for a specific use case (e.g., relative resource loading), or an oversight?
3. `App.tsx` imports `Group`/`Separator` from `react-resizable-panels` — are these custom re-exports or the upstream API? Verify against installed version.
