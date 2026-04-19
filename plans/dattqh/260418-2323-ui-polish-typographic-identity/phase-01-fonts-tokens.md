# Phase 01 — Font Migration + Token Additions

**Context:** [plan.md](./plan.md) · [brainstorm](../reports/frontend-design-260418-2323-localman-ui-polish.md)
**Blocks:** Phase 02, 03, 04 (all depend on token names defined here)

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

- `@fontsource-variable/*` packages serve variable fonts as self-hosted CSS+woff2 — no CDN latency, no FOUC risk if imported at CSS root
- Geist replaces Inter for all UI body text. Fallback stack: `'Geist', 'Inter', system-ui, sans-serif` — Inter already loaded as fallback safety net during font swap
- Fraunces used for display/empty-state hero ONLY — never for body text (legibility at 13px is poor for this typeface)
- Vietnamese coverage: Geist variable covers Latin Extended-A (includes Vietnamese); Fraunces covers Vietnamese (confirmed OFL, no licensing action needed)
- Tailwind v4 `@theme` block — new tokens added alongside existing ones; no breaking changes to existing token names
- `--font-serif` is a new CSS variable, not replacing anything — components explicitly opt in via `font-[family-name:var(--font-serif)]`

---

## Requirements

1. Add `@fontsource-variable/fraunces` and `@fontsource-variable/geist` to `client/package.json`
2. Add `@import` statements at top of `client/src/index.css`
3. Update `--font-sans` token value (Geist first, Inter fallback)
4. Add `--font-serif` token
5. Add `--color-accent-warm`, `--color-danger-soft-deep`, `--shadow-tab-gradient` tokens
6. Verify: build passes, no FOUC observable in Vite dev, `--color-text-on-accent` usage unaffected

---

## Files to Modify

| File | Action |
|---|---|
| `client/package.json` | add 2 devDeps under `dependencies` |
| `client/src/index.css` | add 2 `@import` lines; update `@theme` tokens |

---

## Implementation Steps

### Step 1 — Install font packages

```bash
cd client
pnpm add @fontsource-variable/geist @fontsource-variable/fraunces
```

Verify entries appear in `client/package.json` under `"dependencies"`.

### Step 2 — Add `@import` lines in `index.css`

**Before (lines 1–6):**
```css
@import "tailwindcss";
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/500.css";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
```

**After:**
```css
@import "tailwindcss";
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/500.css";
@import "@fontsource-variable/geist/index.css";
@import "@fontsource-variable/fraunces/index.css";
/* Inter kept as fallback during font-swap regression window */
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
```

> Note: `@fontsource-variable/geist` exports the variable font as `"Geist Variable"` — use that exact name in `font-family` OR check the package's `index.css` to confirm exported family name (it may be `"Geist"` in newer releases). Verify with: `grep "font-family" node_modules/@fontsource-variable/geist/index.css | head -1`

### Step 3 — Token diff in `@theme`

**Typography families (before):**
```css
--font-sans: "Inter", system-ui, -apple-system, Segoe UI, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

**After:**
```css
--font-sans: "Geist Variable", "Geist", "Inter", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
--font-serif: "Fraunces Variable", "Fraunces", Georgia, "Times New Roman", serif;
```

> Confirm actual family name: `grep "font-family" node_modules/@fontsource-variable/fraunces/index.css | head -1`

### Step 4 — New color + shadow tokens

Add under `/* -------- COLOR · Brand / Accent */` block (after `--color-accent-ring`):

```css
--color-accent-warm: #F4B860;  /* amber muted — empty-state editorial highlights */
```

Add under `/* -------- COLOR · Status / Feedback */` block (after `--color-danger-soft`):

```css
--color-danger-soft-deep: rgba(69, 10, 10, 0.20);  /* panel-scoped error bg, deeper than danger-soft */
```

Add under `/* -------- ELEVATION · Shadow ladder */` block (after `--shadow-glow-danger`):

```css
--shadow-tab-gradient: -8px 0 12px rgba(11, 17, 32, 1);  /* request-tab-bar right-scroll fade */
```

### Step 5 — Verify Vietnamese char rendering

After `pnpm --filter client dev`, open browser console and check:

```js
// In DevTools console
document.fonts.ready.then(() => {
  const loaded = [...document.fonts].map(f => f.family + ' ' + f.status);
  console.log(loaded.filter(f => f.includes('Geist') || f.includes('Fraunces')));
});
```

Visually check: render "Không có dữ liệu" at `font-family: var(--font-sans)` 11px and `font-family: var(--font-serif)` 16px — no .notdef boxes (□).

### Step 6 — Build verification

```bash
pnpm --filter client type-check
pnpm --filter client build
```

Check dist CSS includes new font-family values:
```bash
grep -r "Geist" client/dist/assets/*.css | head -3
grep -r "Fraunces" client/dist/assets/*.css | head -3
```

---

## Todo List

- [ ] `pnpm add @fontsource-variable/geist @fontsource-variable/fraunces` in `client/`
- [ ] Confirm exported family names from package `index.css` files
- [ ] Update `@import` lines in `index.css`
- [ ] Update `--font-sans`, add `--font-serif` in `@theme`
- [ ] Add `--color-accent-warm` token
- [ ] Add `--color-danger-soft-deep` token
- [ ] Add `--shadow-tab-gradient` token
- [ ] Screenshot sidebar + titlebar + tab bar at 1280×800 before font switch (save as `plans/dattqh/260418-2323-ui-polish-typographic-identity/research/before-font-switch.png`)
- [ ] Verify Vietnamese rendering in DevTools
- [ ] `pnpm --filter client type-check` → PASS
- [ ] `pnpm --filter client build` → PASS, Geist+Fraunces in dist CSS

---

## Success Criteria

- `pnpm --filter client build` exits 0
- `pnpm --filter client type-check` exits 0
- Browser DevTools: `Geist Variable` and `Fraunces Variable` show `status: "loaded"`
- Existing `text-[var(--color-text-on-accent)]` usages visually unchanged (white on blue/red fills)
- No FOUC on first paint (fonts load before first contentful paint in Vite dev)
- Vietnamese chars render without .notdef glyphs at 11px mono + 16px serif

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Exported font-family name differs from assumed | Grep `node_modules/@fontsource-variable/*/index.css` before writing token value |
| Geist vs Inter metrics cause layout shift | Pre-switch screenshot; post-switch comparison; Inter kept as fallback so shift is gradual |
| Fraunces `woff2` missing subset for Vietnamese | Variable font includes all subsets by default in `@fontsource-variable`; confirm with DevTools Network tab (no 404 on subset files) |
| `--font-serif` JIT: Tailwind not generating `font-serif` utility | Not needed — components use `font-[family-name:var(--font-serif)]` arbitrary value; no JIT class needed |

---

## Unresolved Questions

- Q1: Does `@fontsource-variable/geist` export as `"Geist"` or `"Geist Variable"`? → Must confirm by grepping package after install before writing token. Do not assume.
