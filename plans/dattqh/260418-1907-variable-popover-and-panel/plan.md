---
title: "Variable Popover & Variables-in-Request Panel"
description: "Postman-parity UX cho environment variables: hover popover trong env table (Case A), click popover trên {{var}} chip trong URL/inputs (Case B), right-side Variables in request panel (Case C)."
status: completed
priority: P1
effort: medium
branch: feat/variable-popover-panel
tags: [frontend, ui, env-variables, postman-parity, radix]
created: 2026-04-18
slug: variable-popover-and-panel
blockedBy: []
blocks: []
---

# Variable Popover & Variables-in-Request Panel

**Goal:** Bổ sung 3 UX feature cho variable tương đương Postman — popover textarea trong env table, click-popover trên variable chip, right panel liệt kê variables dùng trong request hiện tại.

**Context:** Consultation report đã scout codebase. Xem `../reports/ask-260418-1900-variable-popover-ux.md` (sẽ cung cấp nếu user yêu cầu).

## Decisions (Postman-parity)

Tất cả câu hỏi mở đã auto-decide theo Postman desktop:

| Q | Decision |
|---|---|
| Popover primitive | `@radix-ui/react-popover` (click + focus triggers) |
| Save UX | Blur-to-save, debounce 300ms trước khi commit IndexedDB |
| Secret vars | Popover ẩn value, hiện nút Reveal (Eye icon) như row hiện tại |
| Source badges | `E` Environment (blue) · `G` Global (yellow) · `$` Dynamic (slate) · `U` Unresolved (red). Bỏ `C` (Collection) — localman chưa có collection-scope vars, YAGNI. |
| Dynamic vars preview | Postman show description ("A v4 style guid") — follow, không live-preview |
| Script-extracted vars (`pm.environment.get`) | Skip phase 1 — chỉ regex `{{var}}` trong URL/headers/body/auth |
| Right panel layout | Flex column (đẩy main co lại) — consistent với sidebar trái |
| Right panel default | Collapsed, toggle qua titlebar icon `Braces` |
| Auto-close trên narrow screens | `< 1200px` width → auto-close |
| Panel shortcut | `Ctrl+Alt+V` (free, không conflict với Ctrl+Shift+V paste) |
| Write-back unresolved vars | Dropdown "Add to: Environment [active] / Global" |

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 01 | Foundation — popover dep + store APIs + extractor | completed | S | [phase-01-foundation.md](./phase-01-foundation.md) |
| 02 | Case A — Env table value popover | completed | S | [phase-02-env-table-popover.md](./phase-02-env-table-popover.md) |
| 03 | Case B — Variable chip popover trong inputs | completed | M | [phase-03-chip-popover.md](./phase-03-chip-popover.md) |
| 04 | Case C — Variables in request right panel | completed | M | [phase-04-variables-panel.md](./phase-04-variables-panel.md) |

Sequential — phase 2 phụ thuộc 1, phase 3 tái dùng popover từ 2, phase 4 dùng extractor từ 1 và deep-link tới phase 3.

## Success Criteria

- Hover row trong env variable table → popover hiện textarea 4 rows, edit + blur save được
- Click `{{var}}` chip trong URL/headers/body/auth → popover hiện resolved value + source badge + link "Variables in request →"
- Click "Variables in request →" → right panel mở, scroll vào variable tương ứng
- Right panel list vars đang dùng trong request active, phân loại theo source
- Secret vars luôn masked mặc định
- Lint + type-check + unit tests pass
- No regression: `VariableHighlightInput` existing tooltip behavior giữ nguyên khi `getResolvedValue` not provided

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Popover anchor trên `{{var}}` span khi input đang focused | High | Chỉ enable trigger khi blurred (overlay mode); click chip blur-then-open |
| Extract vars từ JSON body lớn → perf lag | Med | Memoize theo `activeTabId + draftHash`; regex single-pass |
| 3-pane layout bể trên màn 13" | Med | Auto-collapse < 1200px; localStorage cho width |
| Write-back race với debounced draft save | Med | Variable write qua `environment-store` (riêng draft request), không conflict |
| Secret reveal leak vào Variables panel | High | Panel render mask mặc định, reveal theo row như env table |

## Security Considerations

- Secret env vars: tôn trọng flag ở mọi UI surface (table, chip popover, panel)
- Popover không render secret value vào DOM khi masked (tránh devtools inspect)
- Không log variable values vào console/history

## Related Code Files

- `client/src/components/environments/variable-table.tsx` — Case A anchor
- `client/src/components/common/variable-highlight-input.tsx` — Case B refactor
- `client/src/components/common/key-value-editor.tsx` — Case B inherit qua prop
- `client/src/components/request/url-bar.tsx`, `auth-tab.tsx` — Case B consumers
- `client/src/components/layout/app-layout.tsx`, `titlebar.tsx` — Case C layout
- `client/src/stores/environment-store.ts` — source resolver + write-back APIs
- `client/src/services/interpolation-engine.ts` — regex source of truth
- `client/src/services/request-variable-extractor.ts` — NEW
- `client/src/components/common/variable-value-popover.tsx` — NEW (Case A)
- `client/src/components/common/variable-chip-popover.tsx` — NEW (Case B)
- `client/src/components/layout/variables-panel.tsx` — NEW (Case C)

## Next Steps

1. Review plan → confirm
2. Run `/ck:cook --auto` để impl theo phase order
3. Sau phase 2: demo popover env table, feedback
4. Sau phase 4: e2e test toàn flow, docs update

## Red Team Review

### Session — 2026-04-18
**Findings:** 15 (15 accepted, 0 rejected)
**Severity breakdown:** 4 Critical, 8 High, 3 Medium
**Reviewers:** Security Adversary, Assumption Destroyer, Failure Mode Analyst

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| C1 | Store API ambiguity — `resolveVariableSource`/`writeVariableValue` missing shape (variableId, secret) | Critical | Accept | Phase 01 (Store API additions, Security) |
| C2 | `ResolvedVariable.value` luôn populated → React fiber/DevTools leak secret | Critical | Accept | Phase 01 (types), Phase 02 (popover input), Phase 03 (chip input), Phase 04 (row) |
| C3 | External write vector vào env-store (XSS/script) + prototype pollution via var name | Critical | Accept | Phase 01 (`varsToRecord`, `createVariable`, trust boundary doc) |
| C4 | Debounce orphan write khi env switch / tab close mid-flight | Critical | Accept | Phase 03 (Requirements, blur handler) |
| H5 | `EnvVariable.secret` optional → type mismatch với `secret: boolean` | High | Accept | Phase 01 (resolver normalize `?? false`) |
| H6 | Overlay `onClick` nuốt click → Popover.Trigger không mở | High | Accept | Phase 03 (Refactor + stopPropagation) |
| H7 | `<main>` layout DOM tree không rõ, panel sibling vs nested | High | Accept | Phase 04 (Layout integration comment block) |
| H8 | Memoization stale — đọc persisted `activeRequest` thay vì live draft | High | Accept | Phase 04 (Panel component) |
| H9 | Regex scan 10MB body block main thread | High | Accept | Phase 01 (MAX_BODY_SCAN_BYTES guard) |
| H10 | `focusVarName` không reset → stale highlight khi mở lại panel | High | Accept | Phase 04 (ui-panel-store token + clearFocus) |
| H11 | `classList.add` direct DOM + dynamic Tailwind class bị purge | High | Accept | Phase 04 (state-driven highlight + safelist) |
| H12 | Thiếu variable name validation (prototype pollution, DOM ID injection, empty) | High | Accept | Phase 01 (createVariable), Phase 03 (Unresolved popover), Phase 04 (ref map thay getElementById) |
| M13 | `Object.values(req.auth)` blind scan → miss nested, noise từ `type` field | Medium | Accept | Phase 01 (AUTH_VAR_FIELDS whitelist) |
| M14 | Auto-close `<1200px` resize thrash, không hysteresis/debounce | Medium | Accept | Phase 04 (onResize debounce + hysteresis) |
| M15 | IME compose + blur-save → mất ký tự tiếng Việt/CJK | Medium | Accept | Phase 02 & Phase 03 (blur handler `isComposing` guard) |

**Markers:** Mọi thay đổi có comment `[RED TEAM <id>]` trong phase files để truy vết.

**Post red-team action:** Run `/ck:plan validate` rồi `/ck:cook --auto`.

## Validation Log

### Session 1 — 2026-04-18
**Trigger:** Post-red-team validation (15 findings applied) — confirm 4 open decision points trước khi impl.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Post-C2 fix: `ResolvedVariable.value` nhận `string | null`. Secret reveal cần API gì để fetch plaintext?
   - Options: `resolveVariableSource(name, {reveal: bool})` (Recommended) | Tách 2 API (`resolveVariableMeta` + `revealVariableValue(id)`) | Source.secret + null value, query qua store getter
   - **Answer:** `resolveVariableSource(name, {reveal: bool})` (Recommended)
   - **Rationale:** Single API đơn giản, caller opt-in khi user click Eye. Giữ KISS, hard-gate qua options thay vì tách API.

2. **[Assumptions]** Phase 04 extractor đọc live draft (H8). Request store có `activeDraft` slice riêng không?
   - Options: Verify + fallback activeRequest (Recommended) | Tạo draft slice mới | Chấp nhận lag
   - **Answer:** Verify + fallback activeRequest (Recommended)
   - **Rationale:** YAGNI — impl phase 04 grep store trước; nếu có slice dùng, nếu không fallback activeRequest + accept ~300ms lag. Không scope creep tạo draft slice mới.

3. **[Architecture]** Name validation regex cho `createVariable` (H12) — strictness?
   - Options: `^[a-zA-Z0-9_$.-]+$` (Recommended) | Allow space/Unicode | Chỉ reject dangerous keys
   - **Answer:** `^[a-zA-Z0-9_$.-]+$` (Recommended)
   - **Rationale:** Postman-parity, tránh escape nặng khi render, reject prototype pollution keys.

4. **[Architecture]** Dynamic variable registry — source of truth?
   - Options: Auto-derive từ `Object.keys(dynamicResolvers)` + DESCRIPTIONS map (Recommended) | Hardcode DYNAMIC_REGISTRY
   - **Answer:** Auto-derive (Recommended)
   - **Rationale:** Tránh drift khi thêm resolver mới. DESCRIPTIONS optional fallback name.

#### Confirmed Decisions
- Secret reveal API: single resolver với `{reveal?: boolean}` option
- Draft source: verify-first, fallback activeRequest
- Name validation: strict Postman-style regex
- Dynamic registry: auto-derived từ resolvers

#### Action Items
- [x] Update Phase 01 `resolveVariableSource` signature (Q1)
- [x] Update Phase 01 `DYNAMIC_REGISTRY` to auto-derive (Q4)
- [x] Mark name regex decision in Security section (Q3)
- [x] Phase 04 clarify draft source verification step (Q2)

#### Impact on Phases
- Phase 01: signature change + auto-derive registry
- Phase 04: TODO grep request-store cho draft slice trong impl step

**Recommendation:** Proceed to implementation. All 4 critical decisions aligned với defaults, no revision needed.
