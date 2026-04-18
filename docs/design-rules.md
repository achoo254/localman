# Design Rules — Localman

> Mandatory rules for any UI/UX work in this repo. Pair this file with `docs/design-guidelines.md` (tokens catalog) and `localman-design-system.pen` (visual reference).

## 0. Pre-flight (every UI task)

1. Read `docs/design-guidelines.md` — token catalog and component patterns.
2. Open `localman-design-system.pen` via Pencil MCP — visual reference (36 components + 26 screens).
3. Grep existing components in `client/src/components/` — reuse before creating.
4. Consult `inet-viui` MCP server for any token not yet defined locally (see §6).

---

## 1. Token-First Rule

**All styling MUST consume tokens defined in `client/src/index.css`. No raw hex, rem, px, ms values in components.**

### Consumption patterns (Tailwind v4 + CSS vars)

```tsx
// ✅ Correct — CSS variable via arbitrary value
<div className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]" />

// ✅ Correct — Tailwind slate scale for neutral grays (aligned with --color-text-*)
<span className="text-slate-400" />

// ❌ Wrong — hardcoded hex
<div className="bg-[#0F172A]" />

// ❌ Wrong — arbitrary size not on 4px grid
<div className="p-[13px]" />
```

### Token categories (must be used for…)

| Category | Tokens | Forbidden |
|---|---|---|
| Surfaces | `--color-bg-{primary,secondary,tertiary,elevated,overlay}` | ad-hoc `bg-[#...]` |
| Text | `--color-text-{primary,secondary,muted,subtle,disabled,inverse}` | `text-white`, `text-black` |
| Borders | `--color-border-{default,strong,focus}` | inline hex borders |
| Accent | `--color-accent{,-hover,-active,-soft,-ring}` | other blues |
| HTTP method | `--color-method-{get,post,put,delete,patch,head,options}` | per-component hex |
| Status | `--color-{success,warning,danger,info}` + `*-soft` | raw emerald/amber/red |
| Spacing | `--spacing-{0..16}` (4px grid) | non-grid values |
| Radius | `--radius-{sm,md,default,lg,xl,full}` | arbitrary `rounded-[7px]` |
| Elevation | `--shadow-{sm,md,lg,xl}`, glow variants | inline `shadow-[…]` |
| Motion | `--duration-*`, `--ease-*` | hardcoded `duration-175` |
| Z-index | `--z-{dropdown,modal,popover,tooltip,...}` | `z-[999]` |
| Layout | `--layout-{titlebar-h,envbar-h,sidebar-w,...}` | per-component heights |

---

## 2. Typography Rule

- Use `--font-sans` (Inter) for UI, `--font-mono` (JetBrains Mono) for code, URLs, method badges, status codes, timestamps.
- Font sizes: `--text-{meta,xs,sm,base,md,lg,xl,2xl}` only.
- Weight tokens: `--font-weight-{regular,medium,semibold,bold}`.
- Line-height: `--leading-{tight,snug,normal,relaxed}`.

**Weight convention**

| Weight | Usage |
|---|---|
| 700 | HTTP method badges, hero metrics |
| 600 | Section headers, active tabs, badge text |
| 500 | Button labels, sidebar items, input labels |
| 400 | Body, descriptions, placeholders |

---

## 3. Layout Rule

- Fixed heights/widths come from `--layout-*`. Do not reinvent.
- All gaps are 4px-grid multiples via `--spacing-*`.
- Responsive breakpoints use Tailwind defaults (`sm 640 / md 768 / lg 1024 / xl 1280`). Mobile support is out of scope for MVP — desktop viewport ≥ 1280px is primary target.

---

## 4. Component Rule

Before creating a new component:

1. Grep `client/src/components/**` for existing match.
2. Inspect `localman-design-system.pen` for the canonical visual.
3. Reuse Radix primitives: `@radix-ui/react-{dialog,context-menu,select,dropdown-menu}`.
4. Use patterns documented in `docs/design-guidelines.md` (buttons, inputs, tabs, badges, cards, modals, toasts, context menus, dropdowns).

### New component checklist

- [ ] Uses tokens for all colors/spacing/radius/shadow/motion
- [ ] Keyboard accessible (Tab, Enter, Esc where applicable)
- [ ] Visible `:focus-visible` ring: `focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]`
- [ ] Respects `prefers-reduced-motion` (already global in `index.css`)
- [ ] Min interactive target 32px (dense UI); 44px for primary touch surfaces
- [ ] ARIA role/label where non-obvious
- [ ] File under 200 LoC (split if larger)
- [ ] File name: kebab-case, descriptive (`save-request-dialog.tsx`)

---

## 5. Accessibility Rule (WCAG AA)

- Text contrast ≥ 4.5:1 on dark surfaces. `--color-text-primary` on `--color-bg-primary` passes; `--color-text-muted` on `--color-bg-primary` ≈ 5.7:1 — OK for secondary text only, not body copy.
- Color is never the sole indicator — pair with icon/text (e.g., status badge = color dot + label).
- Keyboard: no traps, logical Tab order, Esc closes overlays, Enter confirms primary actions.
- Announce state via ARIA (`aria-expanded`, `aria-selected`, `aria-invalid`, `aria-describedby`).
- Motion: `prefers-reduced-motion` cuts transitions to 0.01ms (already enforced globally).

---

## 6. inet-viui MCP Workflow (MANDATORY)

When adding ANY new token (color, spacing, radius, duration, shadow, zIndex):

1. **Search first** — `search_tokens({ query })` or `lookup_token({ path })`.
2. **Validate** — `validate_token({ type, value })` before committing a novel value.
3. **Compare** — if multiple variants, use `compare_themes` / token paths.
4. **Add to `client/src/index.css`** under the correct `@theme` section — do not create parallel token files.
5. **Document in `docs/design-guidelines.md`** if the token is user-facing to other devs.

For new UI patterns/blocks: `search_blocks({ query })` then `get_block({ slug })` before inventing a layout.

---

## 7. Anti-Patterns (auto-reject on review)

- Hardcoded `#` hex in components — use tokens.
- `text-white` / `text-black` — use `--color-text-primary` / `--color-text-inverse`.
- Inline `style={{ ... }}` except for per-method badge colors driven by data.
- Manual save buttons — every change auto-persists to IndexedDB.
- Modals for minor feedback — use toast.
- Spinners longer than 300ms without skeleton — switch to skeleton pattern.
- Z-index numeric literals — always `--z-*`.
- Mixing density modes within a single screen.
- Direct cross-origin browser fetch — all remote calls go through `/proxy`.
- New shadow/gradient/color without inet-viui lookup first.

---

## 8. Review Hooks

- After any UI PR: run `mcp__inet-viui__review-design-tokens` on the diff.
- Color/contrast spot-check with browser devtools for new text/background pairs.
- Screenshot diff against `localman-design-system.pen` reference.

---

## 9. File & Folder Conventions

```
client/src/
  components/
    common/        # Cross-feature: button, input, dialog primitives wrappers
    {feature}/     # Feature-scoped components
  index.css        # Single source of truth for @theme tokens
```

- Component name = file name = exported name, all kebab-case filename (`export function MoveRequestDialog` in `move-request-dialog.tsx`).
- No barrel `index.ts` re-exports unless a folder has ≥5 public components.
- Test file next to component: `foo.test.tsx`.

---

## 10. Quick Reference (cheat sheet)

```tsx
// Surface + text
className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"

// Border + focus
className="border border-[var(--color-border-default)]
           focus-visible:border-[var(--color-border-focus)]
           focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"

// Button primary
className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
           text-[var(--color-text-inverse)] font-medium
           rounded-[var(--radius-md)] px-4 py-2
           transition-colors duration-[var(--duration-normal)]"

// Status badge
className="bg-[var(--color-success-soft)] text-[var(--color-success)]
           font-mono text-[length:var(--text-xs)] font-semibold
           rounded-[var(--radius-full)] px-2 py-0.5"

// Modal
className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
           z-[var(--z-modal)]
           bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)]
           rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)]"
```

---

## Unresolved Questions

- Light theme: out of scope for MVP — reconfirm before any light-mode work.
- Mobile breakpoints: current design is desktop-only; need decision if tablet/mobile ever in scope.
- Density modes (compact/comfortable): not tokenised yet — decide before implementing any user-facing density toggle.
