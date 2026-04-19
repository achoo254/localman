# Phase 03 — Refactor Empty/Loading/Error Surfaces

**Context:** [plan.md](./plan.md) · [brainstorm](../reports/frontend-design-260418-2323-localman-ui-polish.md)
**Depends on:** Phase 02 (`EmptyState`, `Skeleton` components must exist)
**Blocks:** Phase 04 (acceptance grep verifies this phase)

---

## Overview

| | |
|---|---|
| Priority | P2 |
| Status | pending |
| Effort | ~90 min (14 surfaces × ~6 min avg) |
| Branch | `feat/ui-polish-typographic-identity` |

---

## Key Insights / Constraints

- ONLY swap empty/loading/error rendering — do NOT touch request execution logic, store calls, or data-fetching
- File ownership: each surface file is independent; no two surfaces share a file (safe for sequential commits)
- Copy tone: numeric labels follow sequential onboarding convention:
  - `"01"` = first-time empty (no data yet)
  - `"02"` = secondary empty (filtered/searched to zero)
  - `"00"` = error/fault state
- Compact variant for sidebar surfaces (space-constrained); editorial for main pane surfaces
- Error variant only for `error-boundary.tsx` (has its own bg — don't double-apply danger bg)
- `json-viewer.tsx:82` null/undefined leaf — lighter treatment: styled `<span>`, NOT full `<EmptyState>` (too heavy inline)
- `collections-tab-sections.tsx` has both a loading state (line 44–45) AND an empty state (line 58–60) — replace both
- `history-sidebar-tab.tsx` loading indicator inside list (`Loading...` text at line 117) is a `load-more` spinner — keep spinner, only swap the empty-list state (line 74–82)
- `test-results-panel.tsx`: `0/0 tests passed` when `testResults.length === 0` — add empty state guard before returning the panel
- `request-panel.tsx:95–110` already has a decent layout but uses generic SVG + `"Select a request from the sidebar"` — replace with editorial EmptyState
- `import-dialog.tsx` pre-upload zone (line 103–113): the dashed-border button IS the upload affordance — wrap/replace with compact EmptyState above the button, don't remove the button itself
- `sidebar-tabs.tsx:246` placeholder `<div>Environments</div>` — this is a bug/placeholder; replace with compact EmptyState

---

## Surface Map (file:line → action)

### Batch A — Response surfaces (2 files)

#### 1. `response/response-cookies-table.tsx:13`

**Before:**
```tsx
return <p className="p-4 text-sm text-[var(--color-text-subtle)]">No cookies.</p>;
```

**After:**
```tsx
return (
  <EmptyState
    variant="compact"
    title="No cookies"
    caption="Send a request to inspect cookies."
  />
);
```

Import: `import { EmptyState } from '../common/empty-state';`

---

#### 2. `response/response-headers-table.tsx:12`

**Before:**
```tsx
return <p className="p-4 text-sm text-[var(--color-text-subtle)]">No headers.</p>;
```

**After:**
```tsx
return (
  <EmptyState
    variant="compact"
    title="No headers"
    caption="Response headers will appear here."
  />
);
```

---

### Batch B — Collections + History (2 files)

#### 3. `collections/collections-tab-sections.tsx:44–46` (loading state)

**Before:**
```tsx
if (isLoading) {
  return <p className="p-4 text-sm text-[var(--color-text-subtle)]">Loading…</p>;
}
```

**After:**
```tsx
if (isLoading) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton variant="table-row" />
      <Skeleton variant="table-row" />
      <Skeleton variant="table-row" />
    </div>
  );
}
```

Import: `import { Skeleton } from '../common/skeleton';`

#### 4. `collections/collections-tab-sections.tsx:55–60` (empty collections state)

**Before:**
```tsx
<div>
  <Folder className="h-6 w-6 text-slate-500" />
</div>
<div>
  <h3 className="text-sm font-semibold text-slate-300">No collections yet</h3>
  <p className="text-xs text-slate-500 mt-1">Create a collection to organize requests</p>
</div>
```

**After:** Replace the entire empty-state block (the wrapping div + its children, roughly lines 48–66 of the `!hasAnyCollections` branch) with:
```tsx
<EmptyState
  variant="editorial"
  numeral="01"
  title="No collections yet"
  caption="Create a collection to organize your requests."
  action={/* keep existing Create Collection button if present, else omit */}
/>
```

Import: `import { EmptyState } from '../common/empty-state';`

#### 5. `collections/collections-tab-sections.tsx:90` (no personal collections sub-empty)

**Before:**
```tsx
<p className="px-4 py-1 text-xs text-slate-600 italic">No personal collections</p>
```

**After:**
```tsx
<EmptyState
  variant="compact"
  numeral="02"
  title="No personal collections"
/>
```

---

#### 6. `history/history-sidebar-tab.tsx:74–82` (empty history list)

**Before:**
```tsx
{entries.length === 0 && !isLoading ? (
  <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
    <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
      <Clock className="w-5 h-5 text-slate-600" />
    </div>
    <div className="text-center">
      <p className="text-sm text-slate-400 font-medium">No history yet</p>
      <p className="text-xs text-slate-600 mt-1">Send a request to start logging</p>
    </div>
  </div>
```

**After:**
```tsx
{entries.length === 0 && !isLoading ? (
  <EmptyState
    variant="editorial"
    numeral="01"
    title="No history yet"
    caption="Send a request to start logging."
  />
```

Import: `import { EmptyState } from '../common/empty-state';`
Remove unused: `Clock` import (if no longer used elsewhere in file — verify before removing).

---

### Batch C — Docs + Environments + Body (3 files)

#### 7. `docs/docs-viewer-page.tsx:89–96` (no collections to document)

**Before:**
```tsx
return (
  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 mt-10">
    <FileText className="h-8 w-8 mb-2 opacity-50" />
    <p className="text-sm">No collections to document.</p>
    <p className="text-xs mt-1">Create a collection first.</p>
  </div>
);
```

**After:**
```tsx
return (
  <EmptyState
    variant="editorial"
    numeral="01"
    title="No collections"
    caption="Create a collection first, then open Docs."
  />
);
```

Import: `import { EmptyState } from '../common/empty-state';`
Remove unused: `FileText` import if not used elsewhere.

---

#### 8. `environments/environment-sidebar-tab.tsx:38–39` (no environments)

**Before:**
```tsx
<p className="text-xs text-slate-500">No environments. Create one in Manage.</p>
```

**After:**
```tsx
<EmptyState
  variant="compact"
  numeral="01"
  title="No environments"
  caption="Open Manage to create one."
/>
```

Import: `import { EmptyState } from '../common/empty-state';`

---

#### 9. `request/body-tab.tsx:54–57` (body type = none)

**Before:**
```tsx
{body.type === 'none' && (
  <p className="p-4 text-sm text-slate-500 flex items-center gap-2">
    <svg …/> No body for this request.
  </p>
)}
```

**After:**
```tsx
{body.type === 'none' && (
  <EmptyState
    variant="compact"
    title="No body"
    caption="Select a body type above to add a payload."
  />
)}
```

Import: `import { EmptyState } from '../common/empty-state';`
Remove: inline `<svg>` element.

---

### Batch D — Error + Tests + Request Panel (3 files)

#### 10. `common/error-boundary.tsx:53–71` (panel variant)

**Before:**
```tsx
<div className="flex flex-col items-center justify-center gap-2 p-4 h-full rounded border border-red-500/20 bg-[var(--color-danger-soft)] text-center" role="alert">
  <p className="text-xs font-medium text-red-400">Panel error</p>
  <p className="text-xs text-slate-500 max-w-xs break-words truncate">{this.state.error.message}</p>
  <button … >Retry</button>
</div>
```

**After:**
```tsx
<EmptyState
  variant="error"
  numeral="00"
  title="Panel error"
  caption={this.state.error.message}
  action={
    <button type="button" onClick={this.handleRetry}
      className="rounded bg-[var(--color-bg-tertiary)] px-3 py-1 text-[length:var(--text-xs)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
      Retry
    </button>
  }
/>
```

#### 11. `common/error-boundary.tsx:74–91` (full/app variant)

**Before:**
```tsx
<div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] rounded-lg border border-red-500/30 bg-[var(--color-danger-soft)] text-center" role="alert">
  <p className="text-sm font-medium text-red-400">Something went wrong.</p>
  <p className="text-xs text-slate-400 max-w-md break-words">{this.state.error.message}</p>
  <button … >Reload app</button>
</div>
```

**After:**
```tsx
<EmptyState
  variant="error"
  numeral="00"
  title="Something went wrong"
  caption={this.state.error.message}
  action={
    <button type="button" onClick={() => window.location.reload()}
      className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[length:var(--text-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-on-accent)] hover:opacity-90">
      Reload app
    </button>
  }
/>
```

Note: `error-boundary.tsx` is a class component — import `EmptyState` at top of file normally.
Import: `import { EmptyState } from './empty-state';`

---

#### 12. `response/test-results-panel.tsx` (zero tests guard)

Current code shows `0/0 tests passed` when `testResults.length === 0` and no error — not a useful state. Add guard:

**Before (line 13):**
```tsx
export function TestResultsPanel({ testResults, error }: TestResultsPanelProps) {
  const passed = testResults.filter(t => t.pass).length;
  const total = testResults.length;

  return (
    <div className="flex flex-col gap-2 p-4">
```

**After:**
```tsx
export function TestResultsPanel({ testResults, error }: TestResultsPanelProps) {
  if (testResults.length === 0 && !error) {
    return (
      <EmptyState
        variant="compact"
        numeral="01"
        title="No tests"
        caption="Add lm.test() calls in your post-request script."
      />
    );
  }

  const passed = testResults.filter(t => t.pass).length;
  const total = testResults.length;

  return (
    <div className="flex flex-col gap-2 p-4">
```

Import: `import { EmptyState } from '../common/empty-state';`

---

#### 13. `request/request-panel.tsx:95–110` (no active request)

**Before:**
```tsx
return (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-slate-500 bg-[var(--color-bg-primary)]">
    <div className="p-4 rounded-full bg-slate-800/50">
      <svg aria-hidden="true" … />
    </div>
    <p className="text-sm">Select a request from the sidebar or create a new one.</p>
    <button … onClick={handleNewRequest} …>New request</button>
  </div>
);
```

**After:**
```tsx
return (
  <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-primary)]">
    <EmptyState
      variant="editorial"
      numeral="01"
      title="No request open"
      caption="Select from the sidebar or press Ctrl+T."
      action={
        <button
          type="button"
          onClick={handleNewRequest}
          className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-on-accent)] transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-md active:scale-95"
        >
          New request
        </button>
      }
    />
  </div>
);
```

Import: `import { EmptyState } from '../common/empty-state';`

---

### Batch E — Layout + Import + JSON + Sidebar (3 surfaces, 3 files)

#### 14. `collections/sidebar-tabs.tsx:246` (Environments placeholder)

**Before:**
```tsx
<div className="p-4 text-sm text-[var(--color-text-subtle)]">Environments</div>
```

**After:**
```tsx
<EmptyState
  variant="compact"
  title="Environments"
  caption="Select the Environments tab to manage variables."
/>
```

Import: `import { EmptyState } from '../common/empty-state';`

---

#### 15. `import-export/import-dialog.tsx:103–113` (pre-upload file zone)

This is not a fully empty state — the dashed button IS the action. Enhance by adding a caption above the button rather than replacing it:

**Before:**
```tsx
<div className="flex flex-col gap-3">
  <p className="text-xs text-[var(--color-text-muted)]">Postman Collection v2.1 or Localman backup JSON</p>
  <button
    type="button"
    onClick={handleFileSelect}
    disabled={loading}
    className="rounded-lg border border-dashed border-slate-600 py-8 px-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
  >
    {loading ? 'Importing…' : 'Choose file…'}
  </button>
</div>
```

**After:**
```tsx
<div className="flex flex-col gap-3">
  <EmptyState
    variant="compact"
    numeral="01"
    title="Import a collection"
    caption="Postman v2.1, OpenAPI 3.0, or Localman JSON"
    className="py-2"
  />
  <button
    type="button"
    onClick={handleFileSelect}
    disabled={loading}
    className="rounded-lg border border-dashed border-[var(--color-border-strong)] py-8 px-4 text-[length:var(--text-sm)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
  >
    {loading ? 'Importing…' : 'Choose file…'}
  </button>
</div>
```

Import: `import { EmptyState } from '../common/empty-state';`

---

#### 16. `response/json-viewer.tsx:80–90` (null/undefined leaf node)

**Lighter treatment** — not full `EmptyState`. The leaf renders inline inside a tree; a full component would break alignment. Just improve the token usage and add semantic clarity:

**Before:**
```tsx
const color =
  value === null ? 'text-[var(--color-text-subtle)]' :
  typeof value === 'number' ? 'text-blue-400' :
  typeof value === 'boolean' ? 'text-purple-400' :
  'text-green-400';
return (
  <div className="font-mono text-sm flex gap-1 flex-wrap" style={{ marginLeft: depth * 12 }}>
    {name !== '' && <span className="text-[var(--color-accent)]">"{name}": </span>}
    <span className={color}>{valStr}</span>
  </div>
);
```

**After** (only color tokens updated; no structural change):
```tsx
const color =
  value === null      ? 'text-[var(--color-text-subtle)]' :
  typeof value === 'number'  ? 'text-[var(--color-method-post)]' :   /* blue */
  typeof value === 'boolean' ? 'text-[var(--color-method-patch)]' :  /* purple */
  'text-[var(--color-method-get)]';                                   /* green */
return (
  <div className="font-mono text-[length:var(--text-sm)] flex gap-1 flex-wrap" style={{ marginLeft: depth * 12 }}>
    {name !== '' && <span className="text-[var(--color-accent)]">"{name}": </span>}
    <span className={color}>{valStr}</span>
  </div>
);
```

> This aligns JSON syntax colors with the existing HTTP method token palette (semantic reuse). No new tokens needed. The `null` leaf keeps `--color-text-subtle` (intentionally dim, not red — it's not an error).

---

## Copy Guidance Summary

| State | Numeral | Tone example |
|---|---|---|
| First-time empty | `"01"` | "No history yet" / "No request open" |
| Secondary empty (filtered) | `"02"` | "No personal collections" |
| Error / fault | `"00"` | "Panel error" / "Something went wrong" |
| Sequential onboarding | `"01"` → `"02"` → `"03"` | Use in wizard/multi-step contexts (future) |

---

## Acceptance Grep

After all 16 surfaces are swapped, run from `client/`:

```bash
# Must return 0 results
grep -rnE '>[[:space:]]*(No [A-Za-z]+\.?)[[:space:]]*<' src/components/ --include='*.tsx'
grep -rnE '>[[:space:]]*(Loading…)[[:space:]]*<' src/components/ --include='*.tsx'
grep -rn 'text-slate-[0-9]' src/components/ --include='*.tsx'
```

> `text-slate-*` grep catches legacy Tailwind scale classes that slipped through design-token-compliance — there should be 0 in modified files.

---

## Files to Modify

| File | Surfaces |
|---|---|
| `response/response-cookies-table.tsx` | #1 |
| `response/response-headers-table.tsx` | #2 |
| `collections/collections-tab-sections.tsx` | #3 #4 #5 |
| `history/history-sidebar-tab.tsx` | #6 |
| `docs/docs-viewer-page.tsx` | #7 |
| `environments/environment-sidebar-tab.tsx` | #8 |
| `request/body-tab.tsx` | #9 |
| `common/error-boundary.tsx` | #10 #11 |
| `response/test-results-panel.tsx` | #12 |
| `request/request-panel.tsx` | #13 |
| `collections/sidebar-tabs.tsx` | #14 |
| `import-export/import-dialog.tsx` | #15 |
| `response/json-viewer.tsx` | #16 (light — tokens only, no EmptyState) |

---

## Todo List

- [ ] Batch A: swap cookies-table + headers-table (#1 #2)
- [ ] Batch B: collections-tab-sections loading + empty (#3 #4 #5) + history-sidebar-tab (#6)
- [ ] Batch C: docs-viewer-page (#7) + environment-sidebar-tab (#8) + body-tab (#9)
- [ ] Batch D: error-boundary panel + full (#10 #11) + test-results-panel (#12) + request-panel (#13)
- [ ] Batch E: sidebar-tabs placeholder (#14) + import-dialog (#15) + json-viewer tokens (#16)
- [ ] Run acceptance greps — 0 results for generic strings + `text-slate-*`
- [ ] `pnpm --filter client type-check` → PASS
- [ ] `pnpm --filter client lint` → PASS

---

## Success Criteria

- Acceptance greps return 0 matches
- `type-check` and `lint` pass
- Every empty surface displays: serif title + mono numeral (editorial) OR serif title (compact)
- Error boundary renders `--color-danger-soft-deep` bg (not `--color-danger-soft`)
- `TestResultsPanel` shows EmptyState when `testResults.length === 0 && !error`
- JSON viewer leaf colors map to existing method token palette (no hardcoded `text-blue-400` etc.)

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| `error-boundary.tsx` is class component — hook imports won't work | `EmptyState` is a plain function component, importable into class render methods — no hooks involved |
| `collections-tab-sections.tsx` empty state block boundaries unclear | Read file lines 48–66 carefully before editing; target the `!hasAnyCollections` conditional branch |
| Removing `Clock` icon import from `history-sidebar-tab.tsx` breaks if used elsewhere | Grep file for `Clock` usage before removing |
| `import-dialog.tsx` compact EmptyState adds height to modal — may push button below fold | Set `className="py-2"` to keep it tight; verify modal scroll is still accessible |
| `json-viewer.tsx` color change: `text-blue-400` → method-post token may differ visually | `--color-method-post: #3B82F6` = blue-500, close to blue-400 (#60A5FA). Acceptable semantic upgrade. |

---

## Unresolved Questions

- Q1: `collections-tab-sections.tsx` Create Collection button inside the empty block — confirm whether it's a prop callback or internal action before deciding to pass it as `action={}` to EmptyState. If it's complex JSX, may be simpler to keep as `action` slot.
- Q2: `app-layout.tsx` "no tabs open" state — brainstorm listed it but code inspection shows the main area always renders `{children}` (request-panel.tsx handles the no-active-request case). Confirmed: no separate empty state needed in `app-layout.tsx` — covered by #13.
