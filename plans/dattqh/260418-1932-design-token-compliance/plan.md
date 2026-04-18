# Plan — Design Token Compliance Fix (v3, post validation)

> Audit & remediate token-rule violations after `index.css` token system expansion + new `docs/design-rules.md`. **v3 = validation answers applied** (semantic rename, opacity token baked proactively, Husky hook, typography migration restored).

- **Date:** 2026-04-18
- **Branch:** main (create feature branch: `feat/design-token-compliance`)
- **Priority:** P1
- **Status:** Completed

## Version History

| v | Change | Source |
|---|---|---|
| v1 | Initial — 7 phases, ~100 sites | Scout scan |
| v2 | 3 phases, ~30 sites, math bugs fixed | Red-team review |
| v3 | Semantic token rename, `bg-primary-80` baked, Husky hook, typography migration restored | Validation interview |

## Summary of v3 Changes (from validation)

| v2 decision | v3 action | Rationale (user answer) |
|---|---|---|
| Keep `--color-text-inverse: #0B1120` | Rename → `--color-text-on-accent: #FFFFFF` | Semantic clarity — name matches actual usage (white on accent/danger/success fills) |
| Defer `bg-[var(--color-bg-primary)]/80` smoke test | Bake `--color-bg-primary-80: rgba(11,17,32,0.8)` proactively | Avoid Tailwind v4 opacity-on-var uncertainty at build time |
| Pre-commit hook TBD (CI recommended) | Husky + lint-staged | Fast local feedback, run on staged files only, no CI wait |
| Phase 5 typography migration out-of-scope | Restored as Phase 2.7 | User reverted red-team Scope F1 — wants `text-[Npx]` → token parity for future theming |

## Scope (final, v3)

Scan of `client/src/components/**` confirmed:
- 11 sites of hardcoded `#0B1120`
- 15 sites of `text-white` on filled buttons (2 exempt: iframe + hover states)
- ~10 dialog overlay `bg-black/50` sites
- 1 toast palette violation (red/emerald Tailwind scale)
- 1 `text-gray-400` at `name-input-dialog.tsx:72`
- 4 static inline `style={{background:'var(...)'}}` sites
- **~50 sites of `text-[Npx]` arbitrary font sizes** (restored from v2 out-of-scope)

**Out of scope (deferred with rationale):**
- ~35 `bg-white/*` hover overlays → native Tailwind pattern already KISS.
- `z-50` on Dialog/Popover content → Radix convention; self-documenting number.
- Shadow tokenization.

## Phase List (3 phases — sequential per CLAUDE.md)

| # | Phase | Files | Status |
|---|---|---|---|
| 1 | Token additions (toast variants) — `on-accent` + `bg-primary-80` already applied | 1 | completed |
| 2 | Component substitutions (hex, text-on-accent, overlay, text-gray, toast, typography) | ~55 | completed |
| 3 | Verify + Husky/lint-staged guard | — | completed |

---

## Phase 1 — Token Additions

**File:** `client/src/index.css`

Already applied:
- `--text-*` now px-based for 14px root parity
- Z-index ladder reordered (popover below modal-backdrop)
- `--color-text-inverse` → **`--color-text-on-accent: #FFFFFF`** (v3)
- Added **`--color-bg-primary-80: rgba(11, 17, 32, 0.8)`** (v3)

Still to add under `@theme`:

```css
/* Toast variant surfaces (replaces red-950/emerald-950 Tailwind palette) */
--color-toast-error-bg:       rgba(127, 29, 29, 0.90);  /* red-950/90 */
--color-toast-error-border:   rgba(239, 68, 68, 0.50);  /* red-500/50 */
--color-toast-error-text:     #FECACA;                   /* red-200 */
--color-toast-success-bg:     rgba(6, 78, 59, 0.90);    /* emerald-950/90 */
--color-toast-success-border: rgba(16, 185, 129, 0.50); /* emerald-500/50 */
--color-toast-success-text:   #A7F3D0;                   /* emerald-200 */
```

**Acceptance:** `pnpm --filter client type-check` passes.

---

## Phase 2 — Component Substitutions

### 2.1 Hardcoded `#0B1120` → `var(--color-bg-primary)` (7 files, 11 sites)

| File:line | Change |
|---|---|
| `collections/sidebar-tabs.tsx:187` | `bg-[#0B1120]` → `bg-[var(--color-bg-primary)]` |
| `layout/titlebar.tsx:19` | same |
| `request/body-tab.tsx:36` | same |
| `response/response-actions.tsx:29` | same |
| `response/response-tabs.tsx:36` | same |
| `response/script-console.tsx:12` | `bg-[#0B1120]/80` → **`bg-[var(--color-bg-primary-80)]`** (v3: new token, no `/80` modifier) |
| `request/request-tab-bar.tsx:97,112,180` | 3× `bg-[#0B1120]` → tokenized |
| `request/request-tab-bar.tsx:114` | gradient `from-[#0B1120] via-[#0B1120]` → `from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]` |
| `request/request-tabs.tsx:32` | `bg-[#0B1120]` → tokenized |

**Note (v3):** `--color-bg-primary-80` baked proactively eliminates Tailwind v4 `/80`-on-var uncertainty. No smoke test dependency.

### 2.2 `text-white` → `text-[var(--color-text-on-accent)]` on filled buttons (13 sites)

| File:line |
|---|
| `environments/environment-manager.tsx:156` |
| `import-export/import-dialog.tsx:130` |
| `import-export/export-dialog.tsx:104` |
| `settings/data-settings.tsx:105` (red destructive) |
| `collections/collections-tab-sections.tsx:64` |
| `common/error-boundary.tsx:86` |
| `common/name-input-dialog.tsx:79` |
| `common/variable-value-popover.tsx:147` (badge) |
| `common/variable-chip-popover.tsx:369,390` |
| `collections/move-request-dialog.tsx:94` |
| `request/auth-tab.tsx:38` |
| `layout/source-badge.tsx:25` |
| `request/save-request-dialog.tsx:126` |
| `request/request-panel.tsx:105` |
| `request/url-bar.tsx:89` |

Pattern: `text-white` → `text-[var(--color-text-on-accent)]`

**Exempt (keep literal):**
- `response/html-preview.tsx:16` — iframe neutral bg/text intentional.
- `request/headers-tab.tsx:40`, `request/request-tab-bar.tsx:171` — `hover:text-white` states.

### 2.3 `text-gray-400` → `text-[var(--color-text-muted)]` (FMA F6)

- `common/name-input-dialog.tsx:72` — Cancel button.
- Grep for any other `text-gray-*` and convert.

### 2.4 Dialog overlay `bg-black/50` → `bg-[var(--color-bg-overlay)]` (7 files)

| File:line |
|---|
| `import-export/import-dialog.tsx:81` |
| `environments/environment-manager.tsx:100` |
| `import-export/export-dialog.tsx:63` |
| `common/keyboard-shortcuts-modal.tsx:17` |
| `collections/move-request-dialog.tsx:49` |
| `common/name-input-dialog.tsx:57` |
| `request/save-request-dialog.tsx:71` |

Also: `toast-provider.tsx:43` `z-[100]` → `z-[var(--z-notification)]`.

### 2.5 Toast palette tokens (AD F3)

`common/toast-provider.tsx:67-69`:

```tsx
// Before:
'bg-red-950/90 border-red-500/50 text-red-200'
'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'

// After:
'bg-[var(--color-toast-error-bg)] border-[var(--color-toast-error-border)] text-[var(--color-toast-error-text)]'
'bg-[var(--color-toast-success-bg)] border-[var(--color-toast-success-border)] text-[var(--color-toast-success-text)]'
```

### 2.6 Static inline `style={{background:'var(...)'}}` → className (4 sites)

- `environments/environment-bar.tsx:30`
- `layout/app-layout.tsx:181, 220`
- `layout/status-bar.tsx:28` (static props only; dynamic stays)

### 2.7 Typography migration `text-[Npx]` → tokens (v3 — restored)

**Scope:** ~50 sites across `client/src/components/**`. Map to nearest token:

| Arbitrary | Token | Tailwind v4 syntax |
|---|---|---|
| `text-[10px]` | `--text-meta` | `text-[length:var(--text-meta)]` |
| `text-[11px]` | `--text-xs`   | `text-[length:var(--text-xs)]`   |
| `text-[13px]` | `--text-sm`   | `text-[length:var(--text-sm)]`   |
| `text-[15px]` | `--text-md`   | `text-[length:var(--text-md)]`   |
| `text-[16px]` | `--text-lg`   | `text-[length:var(--text-lg)]`   |
| `text-[18px]` | `--text-xl`   | `text-[length:var(--text-xl)]`   |

**Gotcha (Tailwind v4 JIT):** The `[length:var(...)]` form is required — plain `text-[var(--text-sm)]` won't compile because Tailwind can't infer the utility namespace. Confirm build output with `pnpm --filter client build` includes these classes.

**Fallback if JIT drops any class:** Add to `vite.config.ts` Tailwind safelist OR use `@utility` shim in `index.css`:

```css
@utility text-meta { font-size: var(--text-meta); }
@utility text-xs   { font-size: var(--text-xs); }
/* ... etc */
```

**Execution order:** do 2.7 LAST in Phase 2 (largest diff, easiest to isolate in its own commit).

**Acceptance checks (all must pass):**

```bash
# Run from client/
grep -rn "#0B1120" src/components/                          # = 0 (ignore rgba literals)
grep -rnE "\btext-white\b" src/components/ | grep -v "html-preview\|hover:" # = 0
grep -rnE "\btext-gray-" src/components/                    # = 0
grep -rn "bg-red-950\|bg-emerald-950" src/components/       # = 0
grep -rnE "text-\[1[0-8]px\]" src/components/               # = 0 (v3 typography)
grep -rn "color-text-inverse" src/                          # = 0 (renamed)
```

---

## Phase 3 — Verify + Enforce

### 3.1 Build & test verification

```bash
pnpm --filter client type-check
pnpm --filter client lint
pnpm --filter client test
pnpm --filter client build
```

**Tailwind v4 safety checks:**
- `grep -r "color-toast-error-bg" client/dist/assets/*.css` → must appear in bundle.
- `grep -r "color-bg-primary-80" client/dist/assets/*.css` → must appear.
- `grep -rE "text-\[length:var" client/dist/assets/*.css` → verify typography JIT produced rules.
- If any missing: add `@utility` shim per §2.7 fallback.

### 3.2 Manual smoke tests

- Open dialog (Ctrl+/): `.Dialog.Overlay` computed bg = `rgba(0,0,0,0.6)`.
- Open context menu + then dialog → menu closes/renders below backdrop.
- Trigger toast (error + success): colors match prior palette.
- Script console: semi-transparent bg still renders (now via baked token, not `/80`).
- Typography: visual diff against `localman-design-system.pen` — tab labels, sidebar items, status bar all pixel-equal.

### 3.3 Husky + lint-staged guard (v3)

Install:

```bash
pnpm -w add -D husky lint-staged
pnpm dlx husky init
```

`.husky/pre-commit`:

```sh
#!/usr/bin/env sh
pnpm dlx lint-staged
```

`package.json` at repo root (or `client/package.json`):

```json
{
  "lint-staged": {
    "client/src/**/*.{ts,tsx}": [
      "bash scripts/check-design-tokens.sh"
    ]
  }
}
```

`scripts/check-design-tokens.sh`:

```bash
#!/usr/bin/env bash
# Fails commit if forbidden design-token patterns reappear.
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
for p in "${FORBIDDEN[@]}"; do
  if grep -rnE "$p" client/src/components/ --include='*.tsx' \
     | grep -v 'html-preview.tsx' \
     | grep -v 'hover:text-white'; then
    echo "❌ Forbidden pattern: $p"; exit 1
  fi
done
```

**Trade-off accepted (v3, per user):** Husky runs locally only — bypassable with `--no-verify`. CI net remains future work.

---

## Risk Assessment (v3)

- **Regression risk (typography):** low-medium. ~50 sites, but each substitution is literal → token; visual diff is pixel-identical once JIT safelist confirmed in §3.1.
- **Tailwind v4 `[length:var(...)]` JIT risk:** mitigated by explicit build-output grep in §3.1 and `@utility` fallback.
- **Husky bypass risk:** accepted — user preferred fast local DX over CI gate.
- **Radix z-index interaction:** mitigated by smoke test §3.2.

## Rollback

Single feature branch. Revert per-phase commits:
- Phase 1: `feat(tokens): add toast variant tokens`
- Phase 2 (5 batches):
  - `fix(tokens): substitute hex bg with bg-primary tokens`
  - `fix(tokens): replace text-white with text-on-accent`
  - `fix(tokens): tokenize dialog overlays + toast palette`
  - `fix(tokens): replace text-gray-* + inline style props`
  - `fix(tokens): migrate text-[Npx] to typography tokens`
- Phase 3: `chore(design): add husky + lint-staged token guard`

---

## Todo List

- [x] P1: Add toast variant tokens to `index.css`
- [x] P2.1: Replace `#0B1120` (7 files, 11 sites) — uses `--color-bg-primary-80` for script-console
- [x] P2.2: `text-white` → `--color-text-on-accent` (13 sites)
- [x] P2.3: `text-gray-400` → muted token
- [x] P2.4: Dialog overlays → `--color-bg-overlay` (7 sites)
- [x] P2.5: Toast palette → tokens (1 file)
- [x] P2.6: Static inline style → className (4 sites)
- [x] P2.7: Typography migration (~50 sites `text-[Npx]` → token form)
- [x] P3: type-check + lint + test + build + CSS grep verify
- [x] P3: Radix z-stack smoke test + typography visual diff
- [x] P3: Install husky + lint-staged, wire `check-design-tokens.sh`

---

## Validation Log

### Session 1 — 2026-04-18

Four critical questions answered via `AskUserQuestion`; plan updated accordingly.

| # | Question | Options presented | User answer | Impact on plan |
|---|---|---|---|---|
| Q1 | `--color-text-inverse: #0B1120` doesn't match actual usage (white on accent) | (a) Keep name, flip to `#FFFFFF`; **(b) Rename → `--color-text-on-accent: #FFFFFF` [Recommended]**; (c) Split into two tokens | **(b)** | `index.css` renamed; Phase 2.2 + acceptance grep + Husky forbidden pattern all updated |
| Q2 | Tailwind v4 `bg-[var(...)]/80` opacity-on-var reliability | (a) Defer — smoke test first; **(b) Proactively bake `--color-bg-primary-80` [Recommended]**; (c) Use inline style | **(b)** | New token `--color-bg-primary-80: rgba(11,17,32,0.8)` added; Phase 2.1 script-console uses it directly |
| Q3 | Forbidden-pattern guard placement | (a) CI workflow [Recommended]; **(b) Husky + lint-staged**; (c) Both | **(b)** | Phase 3.3 rewritten to install husky + lint-staged; added to devDeps |
| Q4 | 50-site `text-[Npx]` migration (previously dropped by red-team Scope F1) | (a) Keep dropped; **(b) Migrate in Phase 2 [user override]**; (c) Defer to follow-up plan | **(b)** | Red-team Scope F1 REVERTED; Phase 2.7 restored with explicit Tailwind v4 JIT mitigation + `@utility` fallback |

**Outcome:** Plan is now internally consistent with all 4 user directives. No remaining open questions from validation.

---

## Unresolved Questions

- Future light-theme support not yet planned — tokens stay single-value.
- Whether to add CI gate *in addition* to Husky later (deferred; not blocking v3).

---

## Red Team Review

### Session — 2026-04-18
**Findings:** 21 (13 accepted, 8 rejected, **1 reverted by user in validation**)
**Severity breakdown:** 4 Critical, 7 High, 10 Medium

| # | Finding | Reviewer | Severity | Disposition | Applied To |
|---|---|---|---|---|---|
| 1 | Token rem math wrong (14px root) | FMA/AD/Scope | Critical | Accept | `index.css` — px values |
| 2 | `text-[length:var(--text-xs)]` JIT edge | FMA | Critical | **Accept-with-mitigation (v3)** | Phase 2.7 includes JIT verify + `@utility` fallback |
| 3 | `bg-[var(...)]/80` opacity on CSS var | FMA | Critical | Accept | **v3: baked `--color-bg-primary-80` token** |
| 4 | z-index popover > modal-backdrop | FMA | High | Accept | `index.css` — popover→150 |
| 5 | Rollback not atomic for 50-site Phase 5 | FMA | High | **Partial accept (v3)** | Split into own commit (§Rollback batch 5) |
| 6 | `--color-bg-overlay` vs Radix specificity | FMA | High | Accept (mitigated) | Phase 3.2 smoke test |
| 7 | `text-gray-400` missed in scope | FMA | Medium | Accept | Phase 2.3 |
| 8 | `z-[var(--z-modal)]` Tailwind v4 purge | AD | Critical | Reject | Modal z-index tokenization dropped |
| 9 | Toast red-950/emerald-950 missed | AD | High | Accept | Phase 1 + 2.5 |
| 10 | Radix internal z-index conflict | AD | High | Accept (mitigated) | Phase 3.2 smoke test |
| 11 | No re-scan / no CI rule | AD | High | **Partial accept (v3)** | Husky only, per user Q3 |
| 12 | Phase 6 grep pattern too narrow | AD | Medium | Accept | Phase 2 acceptance grep tightened |
| 13 | Phase 5 zero-visual-gain churn | Scope | Critical | **REVERTED (v3 via user Q4)** | Phase 2.7 restored |
| 14 | 3 hover tokens vs 1 + opacity | Scope | High | Accept | Hover tokens dropped |
| 15 | Phase 4 z-index over-tokenization | Scope | High | Accept | Only toast tokenized |
| 16 | 7 phases over-engineered | Scope | Medium | Accept | 3 phases |
| 17 | Verbose `text-[length:var(...)]` syntax | Scope | Medium | **Accept (v3)** | Documented required form in §2.7 |
| 18 | Orphan hover tokens deferred | Scope | Medium | Accept | Hover tokens dropped |

**Key risks addressed:**
- Hidden rem math bug (would have broken all text sizing).
- Z-index ladder semantically wrong.
- Toast palette violation previously unscanned.
- Tailwind v4 `/80`-on-var uncertainty (v3: proactive token).

**Key risks remaining (accepted):**
- Husky bypassable (no CI gate) — user-accepted trade-off.
- `[length:var(...)]` JIT — mitigated by build-output grep + `@utility` shim fallback.

---

## Completion Log

**Date completed:** 2026-04-18

**Deviations from plan:**
- `error-boundary.tsx` `bg-red-950/10,/20` → `bg-[var(--color-danger-soft)]` (no toast-error token applicable)
- Phase 2.7 typography: `@layer utilities` shims used instead of `@utility` (Tailwind v4 rejected `@utility` with those names)
- Root `package.json` created (did not exist prior — required for Husky lint-staged config)

**Verification:** type-check PASS, lint PASS, build PASS

**Reports:**
- `plans/dattqh/reports/fullstack-260418-2028-design-token-compliance.md`
- `plans/dattqh/reports/review-260418-2028-design-token-compliance.md`
