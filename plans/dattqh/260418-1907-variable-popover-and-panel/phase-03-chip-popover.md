# Phase 03 — Case B: Variable Chip Popover

**Status:** planned · **Priority:** P1 · **Effort:** M · **Depends on:** Phase 01, 02

## Goal

Click `{{var}}` chip trong URL bar / headers / body raw / auth fields → popover hiện resolved value, source badge, "Variables in request →" link (giống image #6 Postman).

## Key Insights

- `variable-highlight-input.tsx:68-85` overlay render mỗi `{{var}}` là một `<span>` khi input blurred. Tận dụng làm Popover.Trigger.
- Khi input focused → dùng native `<input>`, không có span per-var → popover unavailable trong focus mode (tradeoff acceptable).
- Consumers: `url-bar.tsx`, `auth-tab.tsx` (4 places), `key-value-editor.tsx`.

## Requirements

1. Mỗi `{{var}}` span trong overlay = Popover.Trigger (click mở, không hover để tránh noise)
2. Popover hiện:
   - Input editable (single-line) với resolved value
   - Secret → mask + Eye toggle
   - Source badge: `E`/`G`/`$`/`U` + source name
   - Cloud icon nếu Postman có (bỏ qua — chỉ local)
   - Link "Variables in request →" mở right panel (Case C, deep-link tới variable này)
   - Nếu unresolved: dropdown "Add to: Environment X / Global"
3. Blur input → write-back qua `environment-store.writeVariableValue` (debounce 300ms).
   **[RED TEAM C4]** Snapshot `{envId, variableId}` tại thời điểm popover mount; debounce closure capture snapshot chứ KHÔNG đọc lại từ store. `useEffect` cleanup cancel timer khi unmount. Trước khi commit, verify `envId` vẫn là active env — nếu không, drop write + toast warning "Variable no longer in active environment". **[RED TEAM M15]** Blur handler guard `e.nativeEvent.isComposing` để tránh commit partial IME compose.
4. Click chip → blur input cha trước khi mở popover (để overlay visible)
5. Extend `VariableHighlightInput` với prop mới:
   - `onOpenVariablesPanel?: (focusVarName: string) => void`
6. Keep existing `getResolvedValue` tooltip fallback khi prop mới không provided

## Architecture

### New component

```tsx
// client/src/components/common/variable-chip-popover.tsx

interface VariableChipPopoverProps {
  varName: string;
  onOpenVariablesPanel?: (name: string) => void;
  children: React.ReactNode; // the span trigger
}
```

Internal:
- Subscribe `useEnvironmentStore` → call `resolveVariableSource(varName)`
- Render by source kind
- Write-back via `writeVariableValue` / `createVariable`

### Layout popover content (by source)

**Environment / Global (editable):**
```
┌─────────────────────────────────────┐
│ [input: <current value>]        [👁] │ ← if secret
├─────────────────────────────────────┤
│ E Environment: Prod │ Variables → │ │
└─────────────────────────────────────┘
```

**Dynamic:**
```
┌─────────────────────────────────────┐
│ <current resolved preview>          │ ← readonly, re-generated on each read
│ $ Dynamic: A v4 style guid          │
└─────────────────────────────────────┘
```

**Unresolved:**
```
┌─────────────────────────────────────┐
│ [input: new value]                   │
│ Add to: [Environment ▾] / Global    │
└─────────────────────────────────────┘
```

**[RED TEAM H12]** Trước khi gọi `createVariable(target, name, value)`:
- Validate name khớp `^[a-zA-Z0-9_$.-]+$`
- Reject `__proto__`, `constructor`, `prototype`, empty string
- Nếu var name gốc từ chip không hợp lệ (vd `{{my endpoint}}` có space) → popover hiển thị error state "Invalid variable name. Rename in source input first." — không cho phép add. Core `createVariable` cũng throw để defend-in-depth.

### Refactor variable-highlight-input.tsx

```tsx
// Inside segments.map, for isVar=true spans:
s.isVar ? (
  onOpenVariablesPanel || enableChipPopover ? (
    <VariableChipPopover
      key={i}
      varName={s.text.slice(2, -2).trim()}
      onOpenVariablesPanel={onOpenVariablesPanel}
    >
      <span className="cursor-pointer rounded px-0.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10">
        {s.text}
      </span>
    </VariableChipPopover>
  ) : (
    <span key={i} className="text-[var(--color-accent)]">{s.text}</span>
  )
) : ...
```

Chip click → Radix Popover auto-handles open on click. Focus input cha → popover close via click-outside.

**[RED TEAM H6]** Overlay parent `<div aria-hidden onClick={handleOverlayClick}>` hiện bắt mọi click rồi focus input cha → span Popover.Trigger không bao giờ mở được vì overlay unmount ngay. **Fix:**
- Thêm `e.stopPropagation()` trong `onClick` của `<Popover.Trigger asChild>` span để bubble tới overlay bị chặn
- Refactor overlay: bỏ `onClick={handleOverlayClick}` khỏi wrapper, chỉ attach lên non-var text spans
- Sau khi popover mở, khóa overlay hide-on-focus (flag `keepOverlayMounted` trong `VariableHighlightInput` khi có child popover đang open)

### Backward compat

- Existing `getResolvedValue` tooltip: chỉ render khi `!onOpenVariablesPanel` (tránh double UI)
- `key-value-editor.tsx:85` cần pass through `onOpenVariablesPanel` prop

## Implementation Steps

1. Create `variable-chip-popover.tsx` (~180 LoC, OK)
2. Refactor `variable-highlight-input.tsx`:
   - Add prop `onOpenVariablesPanel?`
   - Wrap var spans conditionally
   - Gate tooltip: show only when chip popover disabled
3. Update `key-value-editor.tsx`: accept + forward `onOpenVariablesPanel`
4. Update consumers:
   - `url-bar.tsx` — pass from parent (which reads global layout state)
   - `auth-tab.tsx` — same
   - `headers-tab.tsx`, `params-tab.tsx`, `body-form-editor.tsx` — via key-value-editor
5. Lift `onOpenVariablesPanel` state: tạm thời stub noop ở phase 3; phase 4 wire vào actual panel open
6. Manual QA: click chip in URL → popover, edit → auto-save, secret → mask, dynamic → readonly, unresolved → add flow

## Todo List

- [ ] Create `variable-chip-popover.tsx`
- [ ] Implement 4 render modes (env/global/dynamic/unresolved)
- [ ] Secret reveal toggle
- [ ] Write-back debounce 300ms
- [ ] Refactor `variable-highlight-input.tsx` với new prop
- [ ] Keep backward-compat tooltip path
- [ ] Pipe prop qua `key-value-editor.tsx`
- [ ] Update all 5 consumers
- [ ] Stub `onOpenVariablesPanel` at layout level (impl in phase 4)
- [ ] Manual QA 4 modes
- [ ] Type-check + lint

## Success Criteria

- Click `{{resourceBaseUrl}}` trong URL bar → popover mở dưới chip
- Input trong popover = current env value, edit + blur → value update trong env store
- Secret var → mặc định mask, Eye toggle reveal
- Dynamic var `{{$guid}}` → readonly preview + description
- Unresolved `{{xyz}}` → add dropdown, chọn target → tạo mới
- Không regression URL/headers/auth/body editors
- Existing tooltip vẫn active ở các input không opt-in

## Related Code Files

- `client/src/components/common/variable-chip-popover.tsx` (new)
- `client/src/components/common/variable-highlight-input.tsx` (refactor)
- `client/src/components/common/key-value-editor.tsx` (add prop)
- `client/src/components/request/url-bar.tsx`
- `client/src/components/request/auth-tab.tsx`
- `client/src/components/request/headers-tab.tsx`, `params-tab.tsx`, `body-form-editor.tsx`

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Click chip trong input đang focused không mở popover (overlay hidden) | Document rằng cần blur input trước; hoặc render overlay chồng input khi có vars (phức tạp — skip) |
| Write-back ghi đè optimistic update của user đang gõ ở env table | `writeVariableValue` chỉ trigger on popover blur, user-edit-in-table cũng qua store → store là single source |
| Popover content quá rộng phá layout chật | `max-width: 360px`, value truncate với tooltip |
| Dynamic var readonly input bị user gõ | Set `readOnly` + `tabIndex={-1}` visual cue |

## Security Considerations

- Secret mask trong chip popover giống env table
- **[RED TEAM C2]** KHÔNG truyền secret value vào `value` prop khi chưa reveal — pass MASK string, fetch on-demand khi user click Eye. Tránh React fiber expose secret qua DevTools.
- Input thêm `autoComplete="off"`, `data-lpignore="true"` để chặn browser autofill save secret.
- **[RED TEAM M15]** IME compose guard trong blur handler.
- **[RED TEAM H12]** Name validation áp dụng cả `writeVariableValue` path nếu ever nhận name user-input (hiện chỉ nhận variableId, safe).

## Unresolved

- Hỗ trợ click chip khi input focused — nếu user feedback yêu cầu, phase 5 có thể thêm "always-on overlay" mode (render chip span chồng lên input với `pointer-events: auto`). YAGNI hiện tại.
