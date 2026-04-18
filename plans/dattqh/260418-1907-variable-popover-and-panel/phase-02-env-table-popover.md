# Phase 02 — Case A: Env Table Value Popover

**Status:** planned · **Priority:** P1 · **Effort:** S · **Depends on:** Phase 01

## Goal

Row value cell trong env variable table → hover/focus → Radix Popover mở textarea 4-row, edit + blur-save. Match layout Postman (image #5).

## Requirements

1. Reusable component `VariableValuePopover` — prop `value`, `onChange`, `secret?`, `envName?`, `trigger`
2. Popover trigger = input hiện tại (không thay thế, anchor only)
3. Trigger khi: `onMouseEnter` row + `onFocus` input
4. Dismiss: click outside, Escape, pointer rời cả row + popover content
5. Textarea trong popover: `rows={4}`, `resize-y`, font-mono
6. Blur textarea → commit qua `onChange` (debounced 300ms ở caller nếu muốn)
7. Secret handling: nếu `secret && !revealed` → popover disabled hoặc show mask + Eye button

## Architecture

### Component API

```tsx
// client/src/components/common/variable-value-popover.tsx

interface VariableValuePopoverProps {
  value: string;
  onChange: (next: string) => void;
  secret?: boolean;
  /** Context label shown at bottom: env name or "Global" */
  sourceLabel?: string;
  /** The element that anchors the popover (usually the existing input). */
  children: React.ReactNode;
  /** Disable popover entirely (e.g., when row is disabled). */
  disabled?: boolean;
}
```

Internal state:
- `open: boolean` — controlled
- `revealed: boolean` — local toggle cho secret
- Mouse enter/leave với grace period 150ms để tránh flicker

### Layout popover content

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ <textarea rows=4>                    │ │
│ │ sid={{sid}}; ssid={{ssid}}          │ │
│ └─────────────────────────────────────┘ │
│ E Environment: Production               │ ← sourceLabel + badge
└─────────────────────────────────────────┘
```

Width: 400px max, min 280px. Side: `bottom`, align: `start`, `sideOffset={4}`.

### Integration vào VariableTable

```tsx
// client/src/components/environments/variable-table.tsx — VariableRow
<td className="p-1">
  <VariableValuePopover
    value={variable.value}
    onChange={v => onUpdate({ value: v })}
    secret={variable.secret}
    sourceLabel={envName}
    disabled={disabled}
    /* [RED TEAM Ass3] KHÔNG disable popover khi secret+!reveal — thay vào đó
     * popover content tự render mask + Eye button inside. Xem "Secret handling" dưới. */
  >
    <input
      type={showValue ? 'text' : 'password'}
      value={showValue ? variable.value : MASK}
      /* ... existing props ... */
    />
  </VariableValuePopover>
</td>
```

`envName` cần pipe xuống qua prop từ `VariableTable` (caller biết context env hay global).

### Hover open logic

```tsx
// Inside VariableValuePopover
const [open, setOpen] = useState(false);
const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const scheduleClose = () => {
  closeTimer.current = setTimeout(() => setOpen(false), 150);
};
const cancelClose = () => {
  if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
};

return (
  <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Anchor asChild>
      <div
        onMouseEnter={() => { if (disabled) return; cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        onFocus={() => { if (disabled) return; setOpen(true); }}
      >
        {children}
      </div>
    </Popover.Anchor>
    <Popover.Portal>
      <Popover.Content
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        side="bottom" align="start" sideOffset={4}
        className="..."
      >
        {/* textarea + source badge */}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
```

## Implementation Steps

1. Create `variable-value-popover.tsx` (~120 LoC target, OK if lên tới 150)
2. Thêm prop `envName?: string` vào `VariableTable` props
3. Pass `envName` từ 2 callers của `VariableTable`:
   - `environment-manager.tsx` — pass active env name cho mỗi env
   - (Global variables UI nếu có) — pass `"Global"`
4. Wrap input value cell trong popover
5. Test thủ công: hover flicker, secret mask, blur save, resize textarea, long value scroll
6. Lint + type-check

## Todo List

- [ ] Create `variable-value-popover.tsx` component
- [ ] Implement hover open/close với grace period
- [ ] Textarea + source badge UI
- [ ] Secret mask integration (reuse Eye pattern from row)
- [ ] Integrate vào `variable-table.tsx`
- [ ] Pipe `envName` prop qua callers
- [ ] Manual QA: hover, focus, blur, escape, click outside, secret toggle
- [ ] Type-check + lint pass

## Success Criteria

- Hover row value 150ms+ → popover mở
- Pointer nhảy từ row sang popover content → popover giữ mở
- Pointer rời cả hai → popover đóng sau 150ms
- Edit textarea, blur → value commit lên store
- Secret row: popover chỉ hiện sau khi reveal
- Không conflict với keyboard nav (Tab qua input vẫn chạy)
- Long value 500+ chars scroll trong textarea, không overflow popover

## Related Code Files

- `client/src/components/common/variable-value-popover.tsx` (new)
- `client/src/components/environments/variable-table.tsx` (modify)
- `client/src/components/environments/environment-manager.tsx` (pass envName)

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Popover flicker khi pointer qua gap row→content | 150ms grace period + `onMouseEnter` trên content |
| Secret reveal state mất khi popover đóng | Lift `revealed` lên row level, đã có sẵn |
| Auto-save IndexedDB spam khi gõ textarea | Popover dùng local state, commit on blur |

## Security Considerations

- **[RED TEAM C2]** Khi `secret && !revealed` → popover content render `<input disabled value={MASK} autoComplete="off" data-lpignore="true" />`. KHÔNG truyền raw `value` prop vào textarea/input cho tới khi user bấm Eye (fetch on-demand). Tránh React fiber lưu plaintext.
- **[RED TEAM M15]** Blur handler guard IME compose: `if (e.nativeEvent.isComposing) return;`. Commit qua `onCompositionEnd` + `onBlur` coordinate — tránh mất ký tự tiếng Việt/Nhật/Hàn khi popover đóng giữa compose.
- Textarea thêm `autoComplete="off"` và `data-lpignore="true"` để chặn browser autofill/password manager lưu secret.
