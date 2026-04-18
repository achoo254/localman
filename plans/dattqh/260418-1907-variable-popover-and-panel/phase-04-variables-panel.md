# Phase 04 — Case C: Variables in Request Right Panel

**Status:** planned · **Priority:** P1 · **Effort:** M · **Depends on:** Phase 01, 03

## Goal

Right-side panel (toggle from titlebar) liệt kê variables trong request active — giống Postman (image #7). Inline edit + Eye reveal + deep-link từ Case B chip popover.

## Requirements

1. Panel `<VariablesPanel>` render ở right side của app layout
2. Collapsible, default collapsed
3. Width resizable (min 280, max 480, default 320) — persist localStorage
4. Auto-close khi `window.innerWidth < 1200`
5. Toggle button trong titlebar (icon `Braces` từ lucide)
6. Keyboard shortcut `Ctrl+Alt+V`
7. Panel sections:
   - **Variables in request** — từ `extractUsedVariables(activeRequest)`, resolved sources
   - **All variables** (collapsible, default collapsed) — full env + global + dynamic list
8. Row click → inline edit mode (giống VariableTable)
9. Row có `focusVarName` (from deep-link) → scroll + highlight 2s
10. Secret vars masked + Eye button

## Architecture

### Layout integration

```tsx
// client/src/components/layout/app-layout.tsx

const [rightPanelOpen, setRightPanelOpen] = useState(false);
const [rightPanelWidth, setRightPanelWidth] = useState(loadFromLS('localman_right_panel_width', 320));
const [focusVar, setFocusVar] = useState<string | null>(null);

const openVariablesPanel = (name?: string) => {
  setRightPanelOpen(true);
  if (name) setFocusVar(name);
};

// Auto-close narrow — [RED TEAM M14] debounce + hysteresis
// close threshold 1200px, re-open allowed > 1300px (hysteresis tránh thrash)
useEffect(() => {
  let t: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      const w = window.innerWidth;
      if (w < 1200 && rightPanelOpen) setRightPanelOpen(false);
      // không auto-reopen: user phải toggle thủ công khi width > 1300
    }, 200);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); if (t) clearTimeout(t); };
}, [rightPanelOpen]);

// [RED TEAM H7] DOM tree chính xác — panel là SIBLING của <main>, không nested:
//
//   <div className="flex min-h-0 flex-1">           // existing flex row
//     <Sidebar />
//     <div className="w-1.5 cursor-col-resize" />   // sidebar resize
//     <main className="min-w-0 flex-1 overflow-auto">  // existing, min-w-0 đã có
//       {children}
//     </main>
//     {rightPanelOpen && (
//       <>
//         <div className="w-1.5 shrink-0 cursor-col-resize ..." onMouseDown={...} />
//         <VariablesPanel width={rightPanelWidth} focusVarName={focusVar}
//           onClose={() => setRightPanelOpen(false)} />
//       </>
//     )}
//   </div>
//
// `<main>` đã có `min-w-0 flex-1` → co lại đúng khi panel mount. Verify bằng DevTools inspection.
```

### Titlebar toggle

```tsx
// client/src/components/layout/titlebar.tsx
<button
  onClick={onToggleVariablesPanel}
  className={rightPanelOpen ? 'text-[var(--color-accent)]' : ''}
  title="Variables in request (Ctrl+Alt+V)"
>
  <Braces className="h-3.5 w-3.5" />
</button>
```

Prop drilling: `AppLayout` owns state, pass `onToggleVariablesPanel` + `rightPanelOpen` xuống `Titlebar`. Pass `openVariablesPanel` xuống `<main>` children qua context hoặc prop.

**Simpler:** tạo tiny Zustand store `ui-panel-store.ts`:
```ts
interface UiPanelStore {
  variablesPanelOpen: boolean;
  /** [RED TEAM H10] dùng token object để mỗi lần deep-link cùng var vẫn re-trigger useEffect */
  focusVar: { name: string; nonce: number } | null;
  width: number;
  /** open(name) tạo nonce mới mỗi lần gọi → effect luôn thấy "new" value */
  open: (focusVarName?: string) => void;
  close: () => void;
  /** [RED TEAM H10] Reset focus sau khi scroll/highlight hoàn tất */
  clearFocus: () => void;
  setWidth: (w: number) => void;
}
```

Bất kỳ component nào cần deep-link → `useUiPanelStore.getState().open(name)`. Xoá prop drilling.

### Panel component

```tsx
// client/src/components/layout/variables-panel.tsx

interface Props {
  width: number;
  focusVarName: string | null;
  onClose: () => void;
}

export function VariablesPanel({ width, focusVar, onClose }: Props) {
  // [RED TEAM H8 · VALIDATION S1-Q2] Verify draft slice trong request-store trước khi impl:
  //   - Nếu có `activeDraft` slice (URL bar/headers/body draft trước auto-save) → dùng trực tiếp
  //   - Nếu KHÔNG có → fallback `activeRequest` + document lag ~300ms theo auto-save debounce
  // TODO(impl): Grep `client/src/stores/request-store.ts` cho `draft|unsaved` slice. Nếu không có, NOT tạo slice mới (YAGNI, scope creep).
  const activeDraft = useRequestStore(s => s.activeDraft ?? s.activeRequest);
  const activeEnvId = useEnvironmentStore(s => s.activeEnvironmentId);
  const envStore = useEnvironmentStore();
  // [RED TEAM H8] Memo deps bao gồm cả draft reference + envId (env switch ảnh hưởng source kind)
  const used = useMemo(() => extractUsedVariables(activeDraft), [activeDraft]);
  const resolvedUsed = useMemo(
    () => used.map(name => envStore.resolveVariableSource(name)),
    [used, activeEnvId, envStore]
  );
  const allVars = [
    ...envStore.getActiveEnvironment()?.variables ?? [],
    ...envStore.globalVariables,
    ...listDynamicVariables(),
  ];

  // [RED TEAM H11] State-driven highlight thay cho classList direct DOM mutation
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const clearFocus = useUiPanelStore(s => s.clearFocus);

  // Scroll-to-focus — [RED TEAM H10, H11, H12]
  useEffect(() => {
    if (!focusVar) return;
    // [RED TEAM H12] Dùng ref map thay getElementById để skip DOM ID injection + CSS.escape
    const el = rowRefs.current.get(focusVar.name);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlighted(focusVar.name);
    const t = setTimeout(() => {
      setHighlighted(null);
      clearFocus(); // [RED TEAM H10] reset store focus sau khi highlight xong
    }, 2000);
    return () => clearTimeout(t);
  }, [focusVar, clearFocus]); // focusVar is {name, nonce} — nonce khác → effect re-run

  return (
    <aside style={{ width }} className="shrink-0 border-l border-slate-800/50 bg-[var(--color-bg-secondary)] flex flex-col">
      <header className="flex items-center justify-between px-3 py-2 border-b border-slate-800/50">
        <span className="text-sm font-semibold">Variables in request</span>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </header>
      <div className="flex-1 overflow-auto">
        {resolvedUsed.map(rv => (
          <VariableRow
            key={rv.name}
            resolved={rv}
            isHighlighted={highlighted === rv.name}
            rowRef={el => { if (el) rowRefs.current.set(rv.name, el); else rowRefs.current.delete(rv.name); }}
          />
        ))}
        <CollapsibleSection title="All variables" defaultOpen={false}>
          {allVars.map(v => <VariableRow ... />)}
        </CollapsibleSection>
      </div>
    </aside>
  );
}
```

### Row component

```tsx
// [RED TEAM H11] Highlight qua className conditional thay classList direct mutation.
// [RED TEAM H12] Không dùng DOM ID với user-controlled name — ref callback map.
function VariableRow({
  resolved,
  isHighlighted,
  rowRef,
}: {
  resolved: ResolvedVariable;
  isHighlighted?: boolean;
  rowRef?: (el: HTMLElement | null) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const secret = resolved.source.kind === 'environment' || resolved.source.kind === 'global'
    ? resolved.source.secret : false;
  // [RED TEAM C2] resolved.value là `string | null` — null khi secret chưa reveal.
  // Chỉ fetch actual value qua store khi user click Eye (không cache trong resolver).
  const displayValue = secret && !revealed
    ? '••••••••'
    : (resolved.value ?? (resolved.source.kind === 'dynamic' ? envStore.resolveDynamicValue(resolved.name) : ''));

  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 ${
        isHighlighted ? 'ring-2 ring-variable-highlight' : ''
      }`}
    >
      <SourceBadge source={resolved.source} />
      <span className="flex-1 font-mono text-xs truncate">{resolved.name}</span>
      <span className="flex-1 truncate text-slate-400 text-xs">{displayValue}</span>
      {secret && <button onClick={() => setRevealed(!revealed)}><Eye .../></button>}
    </div>
  );
}
// [RED TEAM H11] Tailwind safelist (tailwind.config.ts): thêm `ring-variable-highlight`
// hoặc dùng class concrete (e.g. `ring-blue-500`) đảm bảo JIT không purge.
```

`SourceBadge` — circle với letter: E (blue), G (yellow), $ (slate), U (red).

## Implementation Steps

1. Create `stores/ui-panel-store.ts` (~40 LoC)
2. Create `components/layout/variables-panel.tsx` (~200 LoC — OK, vì là feature surface lớn)
3. Create `components/layout/source-badge.tsx` (~30 LoC)
4. Modify `app-layout.tsx`:
   - Consume `useUiPanelStore`
   - Render panel right of main với resize handle (reuse pattern từ sidebar trái)
   - Add resize effect + localStorage persist
   - Add `Ctrl+Alt+V` shortcut handler
   - Add `resize` listener để auto-close < 1200
5. Modify `titlebar.tsx` — add Braces toggle button
6. Wire Case B (phase 3) `onOpenVariablesPanel` → `useUiPanelStore.getState().open(name)`
7. Scroll-to-focus effect
8. Manual QA: toggle, resize, narrow screen, deep-link from chip, secret reveal, empty state

## Todo List

- [ ] Create `ui-panel-store.ts`
- [ ] Create `source-badge.tsx`
- [ ] Create `variables-panel.tsx`
- [ ] Modify `app-layout.tsx` với resize + shortcut + auto-close
- [ ] Modify `titlebar.tsx` với toggle button
- [ ] Wire phase 3 chip "Variables in request →" link
- [ ] Scroll-highlight focused var
- [ ] Empty state khi không có var nào
- [ ] Manual QA
- [ ] Type-check + lint

## Success Criteria

- Click Braces icon → panel mở bên phải
- Active request URL `{{resourceBaseUrl}}/api?x={{token}}` → panel list 2 rows với badge đúng
- Click `{{resourceBaseUrl}}` chip trong URL → popover mở → click "Variables in request →" → panel mở, focus + scroll tới row `resourceBaseUrl`, highlight 2s
- All variables section collapsed mặc định, expand hiện full list
- Secret var masked, Eye reveal
- Panel resize drag hoạt động, persist sau reload
- Màn < 1200px → auto-close

## Related Code Files

- `client/src/stores/ui-panel-store.ts` (new)
- `client/src/components/layout/variables-panel.tsx` (new)
- `client/src/components/layout/source-badge.tsx` (new)
- `client/src/components/layout/app-layout.tsx` (modify)
- `client/src/components/layout/titlebar.tsx` (modify)
- `client/src/components/common/variable-chip-popover.tsx` (wire open)

## Risk Assessment

| Risk | Mitigation |
|---|---|
| 3-pane layout bể khi sidebar trái cũng expanded | Min-width check, auto-close panel phải < 1200 |
| `extractUsedVariables` chạy mỗi render | `useMemo` theo activeRequest reference |
| Scroll-to-focus trước khi DOM render row | `requestAnimationFrame` wrapper hoặc `useLayoutEffect` |
| Panel state mất khi F5 | Width persist localStorage; open-state không persist (default closed là UX expectation) |

## Security Considerations

- Secret vars mặc định mask trong panel
- Không copy secret value vào clipboard qua button (không có button copy trong phase này)

## Unresolved

- Có nên thêm "Copy value" button cạnh mỗi row không? Postman có. Propose: YES, trừ secret vars. Sẽ add trong phase 4 implementation nếu có space UI.
- Edit inline trong panel có nên cũng mở popover textarea (Case A style) không? Propose: YES cho consistency — reuse `VariableValuePopover` từ phase 2.
