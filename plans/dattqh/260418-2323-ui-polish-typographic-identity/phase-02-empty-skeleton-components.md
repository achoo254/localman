# Phase 02 — EmptyState + Skeleton Components

**Context:** [plan.md](./plan.md) · [brainstorm](../reports/frontend-design-260418-2323-localman-ui-polish.md)
**Depends on:** Phase 01 (tokens `--font-serif`, `--color-accent-warm`, `--color-danger-soft-deep` must exist)
**Blocks:** Phase 03 (surfaces import these components)

---

## Overview

| | |
|---|---|
| Priority | P2 |
| Status | pending |
| Effort | ~60 min |
| Branch | `feat/ui-polish-typographic-identity` |

---

## Key Insights / Constraints

- Two new files only — no modification to existing components in this phase
- `EmptyState` is the primary identity carrier: serif title + mono numeral label + mono caption = "Terminal Editorial" signature
- `Skeleton` is purely presentational — no state, no store deps, no logic
- Both components must stay under 200 lines (split if needed)
- `prefers-reduced-motion`: skeleton shimmer MUST stop; empty-state has no animation so no action needed
- No Framer Motion — CSS `@keyframes` only
- `icon?` prop accepts `LucideIcon` (type: `React.FC<{ className?: string }>`) — don't import all of lucide, just the type
- `numeral` auto-value: if omitted, default `"01"`. Caller passes `"02"`, `"03"` for sequential states, `"00"` for error states
- `action` prop is `ReactNode` — caller owns the button; component just slots it in

---

## Requirements

### `empty-state.tsx`

3 variants: `editorial` | `compact` | `error`

**Props interface:**
```tsx
interface EmptyStateProps {
  variant?: 'editorial' | 'compact' | 'error';
  numeral?: string;          // default "01"
  title: string;
  caption?: string;
  action?: React.ReactNode;
  icon?: React.FC<{ className?: string }>;
  className?: string;
}
```

**Visual spec per variant:**

| Attribute | `editorial` | `compact` | `error` |
|---|---|---|---|
| Layout | centered column, `py-8` (32px) vert padding | inline row or tight column, `py-4` | centered column, `py-8` |
| Numeral | 11px mono, `--color-text-subtle` | hidden | 11px mono, `--color-danger` |
| Title | 24px serif (`--font-serif`), `--color-text-primary`, `font-weight-semibold` | 16px serif, `--color-text-secondary` | 24px serif, `--color-danger` |
| Caption | 16px sans, `--color-text-muted` | single line, 13px sans, `--color-text-subtle` | 13px mono, `--color-text-muted` |
| Background | transparent | transparent | `--color-danger-soft-deep` with `--radius-md` border `--color-danger-soft` |
| Icon | optional, 20px, `--color-text-subtle` (editorial) | optional, 16px | optional, 20px, `--color-danger` |
| Accent line | 1px `--color-accent-warm` top border, 24px wide, centered | none | none |

**Editorial variant accent line:** a thin `div` `w-6 h-px bg-[var(--color-accent-warm)] mb-4` above the numeral — the "editorial" identity mark.

### `skeleton.tsx`

3 variants: `line` | `block` | `table-row`

**Props interface:**
```tsx
interface SkeletonProps {
  variant?: 'line' | 'block' | 'table-row';
  width?: string;    // CSS value, default '100%'
  height?: string;   // CSS value; line default '11px', block default '80px', table-row default '32px'
  className?: string;
}
```

**Shimmer keyframe (CSS in index.css or component `<style>`):**
Use a CSS module approach is overkill — inject via Tailwind `@layer` in `index.css`. Add:

```css
/* -------- Skeleton shimmer (mono-stripe) -------------------------------- */
@keyframes shimmer-mono {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

@layer utilities {
  .animate-shimmer-mono {
    background: linear-gradient(
      90deg,
      var(--color-bg-tertiary)   0%,
      var(--color-border-strong) 40%,
      var(--color-bg-tertiary)   60%,
      var(--color-bg-tertiary)   100%
    );
    background-size: 200% 100%;
    animation: shimmer-mono 1.6s ease-in-out infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-shimmer-mono {
    animation: none;
    background: var(--color-bg-tertiary);
  }
}
```

> Add these rules to `client/src/index.css` at end of `@layer utilities` block (line ~240). This is the only modification to `index.css` in Phase 02.

**Variant visual spec:**

| Variant | Shape | Notes |
|---|---|---|
| `line` | full-width `rounded-sm` bar, height 11px | mimics mono text line |
| `block` | rounded-md rectangle, height 80px | mimics code area / response body |
| `table-row` | full-width bar height 32px with subtle inner structure (two `line` skeletons side-by-side, 40%/50% width) | mimics table row (key + value) |

---

## Files to Create

| File | Lines (est.) |
|---|---|
| `client/src/components/common/empty-state.tsx` | ~110 |
| `client/src/components/common/skeleton.tsx` | ~80 |

## Files to Modify

| File | Change |
|---|---|
| `client/src/index.css` | Add `@keyframes shimmer-mono` + `.animate-shimmer-mono` utility + reduced-motion override |

---

## Implementation Steps

### Step 1 — Write `empty-state.tsx`

```tsx
/**
 * EmptyState — typographic identity component for empty/error/loading surfaces.
 * "Terminal Editorial" aesthetic: serif title + mono numeral + mono caption.
 *
 * Variants:
 *  editorial — large hero layout, serif 24px title, accent-warm top bar
 *  compact   — inline sidebar empty, serif 16px title, single-line caption
 *  error     — danger-soft-deep bg, danger-colored numeral + title
 */

import type { ReactNode } from 'react';

interface EmptyStateProps {
  variant?: 'editorial' | 'compact' | 'error';
  numeral?: string;
  title: string;
  caption?: string;
  action?: ReactNode;
  icon?: React.FC<{ className?: string }>;
  className?: string;
}

export function EmptyState({
  variant = 'editorial',
  numeral = '01',
  title,
  caption,
  action,
  icon: Icon,
  className = '',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-1 py-4 px-4 ${className}`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[var(--color-text-subtle)] shrink-0" />}
          <span
            className="text-[length:var(--text-lg)] font-[family-name:var(--font-serif)]
                       font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)]"
          >
            {title}
          </span>
        </div>
        {caption && (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-subtle)] pl-0">
            {caption}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  if (variant === 'error') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 py-8 px-6 rounded-[var(--radius-md)]
                    border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft-deep)] text-center ${className}`}
        role="alert"
      >
        {Icon && <Icon className="w-5 h-5 text-[var(--color-danger)]" />}
        <span
          className="font-[family-name:var(--font-mono)] text-[length:var(--text-xs)]
                     tracking-widest uppercase text-[var(--color-danger)]"
        >
          {numeral}
        </span>
        <p
          className="text-[length:var(--text-2xl)] font-[family-name:var(--font-serif)]
                     font-[var(--font-weight-semibold)] text-[var(--color-danger)] leading-[var(--leading-tight)]"
        >
          {title}
        </p>
        {caption && (
          <p className="font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {caption}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  // editorial (default)
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-8 px-6 text-center ${className}`}>
      {/* Accent line — editorial identity mark */}
      <div className="w-6 h-px bg-[var(--color-accent-warm)] mb-2" aria-hidden="true" />
      <span
        className="font-[family-name:var(--font-mono)] text-[length:var(--text-xs)]
                   tracking-widest uppercase text-[var(--color-text-subtle)]"
      >
        {numeral}
      </span>
      {Icon && <Icon className="w-5 h-5 text-[var(--color-text-subtle)] mt-1" />}
      <p
        className="text-[length:var(--text-2xl)] font-[family-name:var(--font-serif)]
                   font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] leading-[var(--leading-tight)] mt-1"
      >
        {title}
      </p>
      {caption && (
        <p className="text-[length:var(--text-lg)] text-[var(--color-text-muted)] max-w-xs leading-[var(--leading-normal)]">
          {caption}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### Step 2 — Write `skeleton.tsx`

```tsx
/**
 * Skeleton — mono-shimmer loading placeholder.
 * Uses .animate-shimmer-mono CSS class defined in index.css.
 * Respects prefers-reduced-motion (CSS handles it — no JS check needed).
 *
 * Variants:
 *  line       — single text-line placeholder (11px height)
 *  block      — rectangular area placeholder (code/response body)
 *  table-row  — two-column key/value row placeholder
 */

interface SkeletonProps {
  variant?: 'line' | 'block' | 'table-row';
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  variant = 'line',
  width = '100%',
  height,
  className = '',
}: SkeletonProps) {
  if (variant === 'table-row') {
    return (
      <div
        className={`flex gap-3 items-center h-8 px-2 ${className}`}
        style={{ width }}
        aria-hidden="true"
      >
        <div
          className="animate-shimmer-mono rounded-[var(--radius-sm)]"
          style={{ width: '40%', height: height ?? '11px' }}
        />
        <div
          className="animate-shimmer-mono rounded-[var(--radius-sm)]"
          style={{ width: '50%', height: height ?? '11px' }}
        />
      </div>
    );
  }

  const defaultHeight = variant === 'block' ? '80px' : '11px';
  const radius = variant === 'block' ? 'var(--radius-md)' : 'var(--radius-sm)';

  return (
    <div
      className={`animate-shimmer-mono ${className}`}
      style={{
        width,
        height: height ?? defaultHeight,
        borderRadius: radius,
      }}
      aria-hidden="true"
    />
  );
}
```

### Step 3 — Add shimmer styles to `index.css`

Append inside the existing `@layer utilities { … }` block (after last existing shim, around line 239):

```css
  /* Skeleton shimmer — mono-stripe animation */
  .animate-shimmer-mono {
    background: linear-gradient(
      90deg,
      var(--color-bg-tertiary)   0%,
      var(--color-border-strong) 40%,
      var(--color-bg-tertiary)   60%,
      var(--color-bg-tertiary)   100%
    );
    background-size: 200% 100%;
    animation: shimmer-mono 1.6s ease-in-out infinite;
  }
```

Add `@keyframes` block outside `@layer` (after the closing `}`):

```css
@keyframes shimmer-mono {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
```

The existing `@media (prefers-reduced-motion: reduce)` block at line 200–205 already disables all animations via `animation-duration: 0.01ms !important` — shimmer is covered. No separate override needed.

### Step 4 — Type-check

```bash
pnpm --filter client type-check
```

---

## Todo List

- [ ] Write `client/src/components/common/empty-state.tsx`
- [ ] Confirm `--text-2xl` token is `22px` (check index.css line ~84) — use for editorial serif title
- [ ] Write `client/src/components/common/skeleton.tsx`
- [ ] Add `@keyframes shimmer-mono` + `.animate-shimmer-mono` to `index.css`
- [ ] Verify reduced-motion: existing `@media` block covers shimmer — confirm no extra rule needed
- [ ] Visual isolation check: temporarily render `<EmptyState variant="editorial" title="Nothing here" caption="Press Ctrl+T to create a request" />` in `request-panel.tsx` to eyeball before Phase 03
- [ ] `pnpm --filter client type-check` → PASS

---

## Success Criteria

- Both components compile with zero TS errors
- `<EmptyState variant="editorial">` renders: accent-warm top line, mono numeral, serif title, sans caption
- `<EmptyState variant="error">` renders: danger-soft-deep bg, danger numeral + title
- `<EmptyState variant="compact">` renders: no numeral, serif 16px title, tight layout
- `<Skeleton variant="line">` animates shimmer stripe (pause when `prefers-reduced-motion: reduce`)
- `<Skeleton variant="table-row">` shows two misaligned line skeletons (key 40% / value 50%)
- No inline hardcoded hex or px values — all reference tokens

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| `font-[family-name:var(--font-serif)]` JIT not generating rule | Verify in dist CSS after build; fallback: add `.font-serif { font-family: var(--font-serif); }` to `@layer utilities` |
| `--text-2xl` doesn't exist yet | It's defined in current `index.css` at line 84 as `22px` — confirmed present |
| `background-size` + `background-position` animation on CSS var gradient | Tested pattern; works in Chrome/FF/Safari; no known edge cases |
| Reduced motion: `.animate-shimmer-mono` not covered by existing wildcard | Wildcard `* { animation-duration: 0.01ms !important }` DOES cover it — no additional CSS needed |

---

## Unresolved Questions

None — scope fully defined by brainstorm.
