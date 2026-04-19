# Phase 04 — Housekeeping + Full Verification

**Context:** [plan.md](./plan.md) · [brainstorm](../reports/frontend-design-260418-2323-localman-ui-polish.md)
**Depends on:** Phase 01 (`--shadow-tab-gradient` token must exist), Phase 03 (surfaces refactored)
**Blocks:** nothing — this is the final phase

---

## Overview

| | |
|---|---|
| Priority | P2 |
| Status | pending |
| Effort | ~45 min |
| Branch | `feat/ui-polish-typographic-identity` |

---

## Key Insights / Constraints

- Two small fixes: `check-design-tokens.sh` staged-file arg handling + `request-tab-bar.tsx` shadow hardcode
- Then full verify pass: type-check → lint → test → build
- Visual QA is manual — 5 specific screenshots to capture
- Font-swap regression checklist is the highest-effort item: sidebar and tab widths can shift with Geist vs Inter
- Commit plan: suggest 3–4 commits per phase for clean per-commit rollback (see below)

---

## Requirements

1. Fix `scripts/check-design-tokens.sh`: accept `$@` staged file list; fall back to full dir scan when empty
2. Fix `request/request-tab-bar.tsx:180`: replace hardcoded `shadow-[-8px_0_12px_rgba(11,17,32,1)]` with `shadow-[var(--shadow-tab-gradient)]`
3. Verify all 4 commands pass: type-check, lint, test, build
4. Visual QA: 5 screenshots match expected states
5. Font-swap regression: sidebar width, tab labels, button padding, Vietnamese text all within tolerance

---

## Files to Modify

| File | Change |
|---|---|
| `scripts/check-design-tokens.sh` | Rewrite to accept `$@`; fallback to full scan |
| `client/src/components/request/request-tab-bar.tsx` | Line 180: shadow class swap |

---

## Fix 1 — `scripts/check-design-tokens.sh`

### Problem

Current script scans `client/src/components/` unconditionally. When wired to `lint-staged`, it receives a list of staged files as `$@` — but ignores them, re-scanning the whole tree on every commit. Slow and produces false positives from files not being committed.

### Rewrite

```bash
#!/usr/bin/env bash
# check-design-tokens.sh
# Usage:
#   Called by lint-staged with staged files as args: check-design-tokens.sh file1.tsx file2.tsx ...
#   Called standalone (pre-push / manual audit): check-design-tokens.sh  (no args → full scan)
#
# Exits 1 if any forbidden design-token pattern is found.
set -e

FORBIDDEN=(
  '#0B1120'
  '#0F172A'
  '#1E293B'
  '\btext-white\b'
  '\btext-gray-'
  '\bbg-red-950\b'
  '\bbg-emerald-950\b'
  'color-text-inverse'
  'text-\[1[0-8]px\]'
)

# If staged files passed as args, scan only those; else full component tree
if [ "$#" -gt 0 ]; then
  TARGETS=("$@")
else
  # Full scan fallback — used for pre-push safety or manual audit
  mapfile -t TARGETS < <(find client/src/components -name '*.tsx' -type f)
fi

FAILED=0
for p in "${FORBIDDEN[@]}"; do
  # grep exits 0 if match found; we want to catch that as failure
  MATCHES=$(grep -lnE "$p" "${TARGETS[@]}" 2>/dev/null \
    | grep -v 'html-preview.tsx' || true)
  # Second pass: filter hover: exceptions for text-white
  if [ "$p" = '\btext-white\b' ]; then
    MATCHES=$(grep -nE "$p" "${TARGETS[@]}" 2>/dev/null \
      | grep -v 'html-preview.tsx' \
      | grep -v 'hover:text-white' || true)
  fi
  if [ -n "$MATCHES" ]; then
    echo "❌ Forbidden pattern '$p' found:"
    echo "$MATCHES"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "Fix: replace hardcoded values with design tokens from client/src/index.css"
  exit 1
fi

echo "✓ Design token check passed (${#TARGETS[@]} files scanned)"
```

### Key changes vs prior version

| Before | After | Reason |
|---|---|---|
| Always scans `client/src/components/` | `$@` if provided, else `find` fallback | lint-staged passes staged files; standalone still works |
| `grep -rnE "$p" client/src/components/` | `grep -lnE "$p" "${TARGETS[@]}"` | Array expansion works with both staged list and find output |
| Single pass for `text-white` | Split pass with `grep -v 'hover:text-white'` on value only | `-l` (files-only) is fast for first pass; `-n` for text-white to filter hover: lines |
| No exit summary | Prints file count scanned | DX: confirms script ran and how many files |

> **Note:** `mapfile` requires bash 4+. Git Bash on Windows ships bash 4.4+ — confirmed safe. If ever running in `sh` context, replace with `while IFS= read -r` loop.

---

## Fix 2 — `request-tab-bar.tsx:180` Shadow Token

### Problem (from brainstorm H2)

```tsx
// Line 180 — current
<div className="flex items-center gap-1 shrink-0 bg-[var(--color-bg-primary)] pl-1 pr-1 h-full shadow-[-8px_0_12px_rgba(11,17,32,1)] z-10 pt-1">
```

The shadow value is hardcoded — ties visual behaviour to a magic rgba that duplicates `--color-bg-primary`. It was intentionally deferred in design-token-compliance (shadow tokenization was out of scope). Now `--shadow-tab-gradient` exists (added in Phase 01).

### Fix

```tsx
// Line 180 — after
<div className="flex items-center gap-1 shrink-0 bg-[var(--color-bg-primary)] pl-1 pr-1 h-full shadow-[var(--shadow-tab-gradient)] z-10 pt-1">
```

Single class replacement. No logic change.

---

## Verification Commands

Run in order — each must pass before proceeding to next:

```bash
# 1. Type safety
pnpm --filter client type-check

# 2. Lint (ESLint — catches unused imports from Phase 03 removals)
pnpm --filter client lint

# 3. Unit tests
pnpm --filter client test

# 4. Production build
pnpm --filter client build
```

### Build output checks (after step 4)

```bash
# Fonts present in bundle
grep -r "Geist" client/dist/assets/*.css | head -3
grep -r "Fraunces" client/dist/assets/*.css | head -3

# Shadow token resolved
grep -r "shadow-tab-gradient" client/dist/assets/*.css | head -3

# No forbidden hardcodes survived tree-shaking
grep -rn "#0B1120" client/dist/assets/*.css     # expect 0
grep -rn "text-white" client/dist/assets/*.css  # expect 0 (Tailwind purges unused)
```

---

## Visual QA Checklist (5 screenshots)

Capture at 1280×800 viewport, dark mode. Compare against pre-switch screenshots from Phase 01.

| # | State | How to trigger | What to check |
|---|---|---|---|
| 1 | **Home — no request open** | Fresh load, no tabs | Editorial EmptyState: serif "No request open", mono "01", accent-warm top bar visible |
| 2 | **History empty** | Clear history or fresh DB | Editorial EmptyState: serif "No history yet", mono caption |
| 3 | **Response cookies/headers empty** | Send request that returns no cookies (e.g. `GET https://httpbin.org/get`) | Compact EmptyState in each tab: serif title, no numeral shown |
| 4 | **Error boundary** | Open browser console → `throw new Error("test")` in a component, OR temporarily add `throw new Error("QA test")` in `request-panel.tsx` and revert | Error variant: danger-soft-deep bg, "00" numeral in danger color, serif title |
| 5 | **Import dialog — pre-upload** | Open Import dialog | Compact EmptyState heading above dashed file button; layout not broken |

---

## Font-Swap Regression Checklist

Compare screenshots taken in Phase 01 (before switch) vs current (after switch):

| Check | Method | Pass if |
|---|---|---|
| Sidebar width unchanged | Measure `--layout-sidebar-w` in DevTools computed styles | Still `260px` (`16.25rem`) |
| Tab label widths | Inspect request tab bar with multiple tabs open | No tab label wraps or truncates differently |
| Button padding visually consistent | Check "Send" button, "New request" CTA | Visual height same (Inter and Geist have similar cap-height; shift <2px acceptable) |
| Vietnamese text at 11px mono | Render `font-mono`: "Không có dữ liệu" | No .notdef glyph boxes |
| Vietnamese text at 16px serif | Render `font-serif`: "Không có dữ liệu" | No .notdef glyph boxes |
| Status bar text fits | Check `--layout-statusbar-h: 24px` | Text doesn't clip vertically |
| Inter still loads as fallback | DevTools → Network → filter by "inter" | Inter woff2 files still requested (retained as explicit fallback) |

---

## Suggested Commit Plan

### Phase 01 commits
```
feat(fonts): add Fraunces Variable + Geist Variable fontsource deps
feat(tokens): add --font-serif, update --font-sans to Geist, add accent-warm + danger-soft-deep + shadow-tab-gradient
```

### Phase 02 commits
```
feat(components): add EmptyState editorial/compact/error variants
feat(components): add Skeleton mono-shimmer with shimmer-mono keyframe
```

### Phase 03 commits
```
fix(surfaces): EmptyState — response cookies, headers; collections loading+empty; history empty (batch A+B)
fix(surfaces): EmptyState — docs, environments, body-tab (batch C)
fix(surfaces): EmptyState — error-boundary, test-results, request-panel (batch D)
fix(surfaces): EmptyState — sidebar-tabs, import-dialog; json-viewer token colors (batch E)
```

### Phase 04 commits
```
fix(design): tokenize request-tab-bar shadow via --shadow-tab-gradient
fix(scripts): check-design-tokens.sh accepts $@ staged files, falls back to full scan
```

> Total: 10 commits. Each is independently revertable without cascading damage (no commit touches more than one concern).

---

## Todo List

- [ ] Read `scripts/check-design-tokens.sh` current content before rewriting
- [ ] Rewrite `check-design-tokens.sh` per spec above
- [ ] Chmod +x if needed: `git update-index --chmod=+x scripts/check-design-tokens.sh`
- [ ] Test script standalone: `bash scripts/check-design-tokens.sh` → "✓ ... files scanned"
- [ ] Test script with staged file list: `bash scripts/check-design-tokens.sh client/src/components/common/empty-state.tsx` → pass
- [ ] Fix `request-tab-bar.tsx:180` shadow class
- [ ] `pnpm --filter client type-check` → PASS
- [ ] `pnpm --filter client lint` → PASS (check for unused imports from Phase 03)
- [ ] `pnpm --filter client test` → PASS
- [ ] `pnpm --filter client build` → PASS
- [ ] Build dist CSS: Geist + Fraunces present
- [ ] Build dist CSS: `--shadow-tab-gradient` resolved
- [ ] Visual QA screenshot #1: home empty
- [ ] Visual QA screenshot #2: history empty
- [ ] Visual QA screenshot #3: response cookies/headers empty
- [ ] Visual QA screenshot #4: error boundary (panel + full)
- [ ] Visual QA screenshot #5: import dialog pre-upload
- [ ] Font-swap regression: sidebar width, tab labels, buttons, Vietnamese chars — all pass
- [ ] Run acceptance grep from Phase 03: 0 generic string literals, 0 `text-slate-*`

---

## Success Criteria

- All 4 verify commands exit 0
- `check-design-tokens.sh` with `$@`: runs in <500ms on a single file (no full-tree scan)
- `check-design-tokens.sh` without args: scans full tree, exits 0 (no violations)
- `request-tab-bar.tsx` contains no `rgba(11,17,32` literal
- All 5 visual QA screenshots show correct EmptyState/Skeleton rendering
- Vietnamese text renders without .notdef glyphs in both Geist (11px) and Fraunces (16px)
- Sidebar width: 260px (unchanged from pre-switch baseline)

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| `mapfile` unavailable in older bash | Git Bash on Win ships bash 4.4+ — acceptable. Document fallback for CI if needed. |
| `grep -lnE` with array: bash quoting issues on paths with spaces | Plan directory has no spaces; `"${TARGETS[@]}"` with double-quotes handles them anyway |
| Unused import warnings after Phase 03 (`Clock`, `FileText`, `Folder`) become lint errors | Phase 04 `pnpm lint` will surface these; fix before committing Phase 04 (or fix in Phase 03 commits) |
| Shadow token `shadow-[var(--shadow-tab-gradient)]` requires Tailwind to pass CSS vars in arbitrary shadow — v4 supports this but JIT may not emit correct class | Verify in dist CSS; fallback: inline `style={{ boxShadow: 'var(--shadow-tab-gradient)' }}` |
| Build passes but fonts 404 in production (path resolution) | Check `client/dist/assets/` for woff2 files after build; `@fontsource-variable` copies fonts into dist automatically via Vite |

---

## Unresolved Questions

None — all decisions locked by brainstorm + Phase 01–03 definitions.
