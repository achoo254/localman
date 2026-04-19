# Frontend Design Brainstorm — Localman UI Polish Pass

**Date:** 2026-04-18 · 23:23
**Author:** FE expert (autonomous)
**Context:** Post design-token-compliance. Client có token system sạch, variable panel mới, nhưng nhiều surface vẫn generic "Postman clone". Cần commit một aesthetic direction có bản sắc hơn.

---

## 1. Aesthetic Direction (chosen)

**"Terminal Editorial"** — refined dark, typographic-first, mono/serif contrast, mật độ trung bình.

| Dial | Value | Rationale |
|---|---|---|
| `DESIGN_VARIANCE` | 5 | Giữ predictable layouts cho productivity tool, nhưng phá symmetry ở hero/empty states |
| `MOTION_INTENSITY` | 3 | Productivity > spectacle. Chỉ motion có purpose (skeleton, route hand-off, toast spring) |
| `VISUAL_DENSITY` | 6 | Postman-alternative → power users đọc nhiều data. Dense nhưng không chật. |

**Differentiation (1 điều nhớ được):** Mỗi surface empty/error/loading có một **typographic identity riêng** (serif display + mono caption) thay vì generic "No data" paragraph. Đây là thứ Postman/Insomnia/Bruno không đầu tư.

**Font pair đề xuất:** `Fraunces` (serif display cho titles/empty-state hero) + `JetBrains Mono` (giữ cho code) + `Geist` (body/UI, thay Inter). Fraunces hỗ trợ tiếng Việt tốt, variable font, tính cách rõ rệt.

**Palette giữ nguyên** — design tokens vừa refactor xong (dark `#0B1120` / accent blue `#3B82F6`). Thêm 1 accent warm mới: `--color-accent-warm: #F4B860` (amber muted) cho empty-state illustrations + editorial highlights.

---

## 2. Polish Areas (ranked by impact)

### A. Empty / Loading / Error State System ⭐ (highest impact, lowest risk)

**Vấn đề hiện tại:**
- `"No cookies."` `"No headers."` `"Environments"` `"Loading…"` — string literal, không identity
- Không có skeleton; request-in-flight chỉ có spinner button
- Error boundary vừa được token hóa nhưng vẫn generic icon + paragraph

**Hướng thiết kế:**
- Component family: `<EmptyState variant="editorial">` với 3 parts: 
  1. Numeric label (`01` `02` ...) mono
  2. Title serif lớn (`Nothing here yet`)
  3. Caption mono dim với action hint (`Press ⌘K to open command palette` / `⌃+Enter to send`)
- Skeleton: shimmer mono — tôn vinh JetBrains Mono bằng cách hiển thị `████ ██ ███` animated pulse thay vì generic bg-slate block
- Error card: ghi lại HTTP request ID + timestamp ở corner (monospace), tăng feeling "pro tool"

**File scope:** `~15 surfaces` —
response-cookies-table, response-headers-table, collections-tab-sections, history-sidebar-tab, docs-viewer-page, environment-sidebar-tab, body-tab (none), error-boundary (panel + page), test-results-panel (no results), request-panel (no tab), app-layout (no request selected), import-dialog (no file), json-viewer (null/undefined leaf), history (empty), docs (no requests).

### B. Response Viewer "Typographic Upgrade"

**Vấn đề:**
- JSON viewer: đều dùng `text-gray-400/500` (vừa swap sang muted/subtle), folding chevron nhỏ, không có line numbers, syntax colors chưa tuned
- Response tabs: status code không có visual weight, runtime/bytes bị chôn trong status bar
- Không có "hero status display" — status `200 OK · 142ms · 2.4 KB` xứng đáng xuất hiện to ở top response pane

**Hướng thiết kế:**
- `ResponseHero` new component ở top response: method pill + status code serif 24px + metric row mono. Inspiration: Linear's issue header, Vercel deployment page.
- JSON viewer: add line numbers column mono subtle, syntax colors tuned (string=accent-warm, number=method-put amber, bool=method-get green, null=method-delete red), hover highlight by path.
- Response tabs: active tab underline animated (layout transition).

**File scope:** `~6 files` — response-pane (new hero), response-tabs, json-viewer (syntax pass), response-body-viewer, response-actions (merge into hero?), script-console (spacing).

### C. Command Palette (⌘K)

**Vấn đề:** Keyboard shortcuts rời rạc (Ctrl+T, Ctrl+Enter, Ctrl+/), không có single entry point để discover + execute.

**Hướng thiết kế:**
- Radix Dialog + fuse.js fuzzy search
- Actions: New tab, Open request (by name/URL), Switch environment, Run collection, Toggle variables panel, Open docs, Copy as cURL, Export, Settings
- Visual: centered modal, serif title + mono results, grouped by category, arrow navigation
- Trigger: `Ctrl+K` / `Cmd+K`, hint in titlebar

**File scope:** `~4 new files` — command-palette.tsx, command-palette-store.ts, command-actions.ts, hotkey integration in app-layout.

### D. Follow-ups từ review (housekeeping)

- **M1** error-boundary: tạo `--color-danger-soft-deep` hoặc dùng `--color-bg-tertiary` cho panel-scoped error để phân biệt depth
- **L2** shadow token gap: `--shadow-tab-gradient` cho request-tab-bar hardcoded rgba
- **H2** `check-design-tokens.sh`: dùng `$@` (staged files) thay vì scan toàn dir

---

## 3. Recommendation

**Ship A + D trước** (1 phase, ~1 tuần). Đây là:
- High ROI: empty/error/loading là surface người dùng gặp nhất khi onboard
- Low risk: tạo component mới, không phá existing flow
- Tạo foundation typographic identity để B/C kế thừa

**B tiếp theo** (1 phase) — Response viewer hero + JSON typography upgrade.

**C (Command Palette)** deferred — là feature, không phải design polish; tách roadmap riêng.

---

## 4. Brainstorm Summary (để feed vào /ck:plan)

**Plan title:** Localman UI Polish — Typographic Identity System (Phase 1)

**Scope (Phase 1 — A + D):**
1. Add font: `Fraunces` variable, `Geist` via `@fontsource` (replace Inter for UI)
2. Add tokens: `--color-accent-warm: #F4B860`, `--color-danger-soft-deep`, `--shadow-tab-gradient`, `--font-serif: Fraunces`, update `--font-sans: Geist`
3. Create `<EmptyState>` component family: 3 variants (`editorial`, `compact`, `error`)
4. Create `<Skeleton>` component with mono-shimmer style
5. Refactor 15 empty/loading/error surfaces to use new components
6. Fix shadow hardcode in `request-tab-bar.tsx`
7. Fix `check-design-tokens.sh` to use `$@`
8. Verify: build + lint + type-check + visual QA (compare before/after screenshots)

**Out of scope (defer):**
- Response viewer hero (B) — next phase
- Command palette (C) — separate feature plan
- Motion: chỉ CSS transitions, không thêm Framer Motion

**Risks:**
- Font swap (Inter → Geist) có thể shift layout widths — cần visual regression sweep
- Fraunces variable weight chỉ dùng cho display; tránh body để giữ legibility

**Success:**
- 0 generic "No X" string literal còn sót
- Loading skeleton xuất hiện trong <100ms từ action
- Visual identity khác biệt Postman/Insomnia — reviewer có thể nhận ra screenshot là Localman

---

## Unresolved Questions

- **Q1:** Có cần licensing check cho Fraunces (SIL OFL, OK) + Geist (OFL, OK)? Đã tự xác nhận — không cần hỏi.
- **Q2:** User muốn ship ngay Phase 1 hay cần prototype Figma/.pen trước? → Plan sẽ note cả 2 path.
- **Q3:** Có giữ Inter làm fallback nếu Geist load chậm? → Plan sẽ recommend yes, `font-family: 'Geist', 'Inter', sans-serif`.
