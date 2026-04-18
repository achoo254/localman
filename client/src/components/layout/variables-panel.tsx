/**
 * Right-side panel listing variables used in the active request (Case C).
 * Environment/global rows are inline-editable (blur-save, debounced).
 *
 * [RED TEAM H8 · VALIDATION S1-Q2] Reads `activeRequest` from request-store
 *   (no dedicated draft slice; accepts ~3s debounce lag inherent to auto-save).
 * [RED TEAM H10] focusVar uses nonce token so repeated deep-links re-trigger effect.
 * [RED TEAM H11] Highlight via conditional className, not classList mutation.
 * [RED TEAM H12] Ref-map lookup by name, not DOM ID (no CSS.escape needed).
 * [RED TEAM C2] Secret values fetched on-demand via resolveVariableSource({reveal:true}).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, X } from 'lucide-react';
import { useRequestStore } from '../../stores/request-store';
import {
  useEnvironmentStore,
  type ResolvedVariable,
  type VariableSource,
} from '../../stores/environment-store';
import { useUiPanelStore } from '../../stores/ui-panel-store';
import { extractUsedVariables } from '../../services/request-variable-extractor';
import { listDynamicVariables } from '../../services/dynamic-variables';
import { useVariableValueDraft } from '../../hooks/use-variable-value-draft';
import { SourceBadge } from './source-badge';

interface VariablesPanelProps {
  width: number;
  onClose: () => void;
}

export function VariablesPanel({ width, onClose }: VariablesPanelProps) {
  const activeRequest = useRequestStore(s => s.activeRequest);
  const environments = useEnvironmentStore(s => s.environments);
  const globalVariables = useEnvironmentStore(s => s.globalVariables);
  const resolveVariableSource = useEnvironmentStore(s => s.resolveVariableSource);
  const focusVar = useUiPanelStore(s => s.focusVar);
  const clearFocus = useUiPanelStore(s => s.clearFocus);

  const usedNames = useMemo(
    () => extractUsedVariables(activeRequest),
    [activeRequest]
  );

  // Re-resolve when env/global changes, not just when used list changes.
  const resolvedUsed = useMemo(
    () => usedNames.map(name => resolveVariableSource(name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usedNames, environments, globalVariables, resolveVariableSource]
  );

  const activeEnv = environments.find(e => e.is_active);
  const allRows: AllRow[] = useMemo(() => {
    const out: AllRow[] = [];
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (!v.key?.trim()) continue;
        out.push({
          kind: 'environment',
          envId: activeEnv.id,
          envName: activeEnv.name,
          variableId: v.id,
          name: v.key.trim(),
          value: v.secret ? null : v.value,
          secret: v.secret ?? false,
        });
      }
    }
    for (const v of globalVariables) {
      if (!v.key?.trim()) continue;
      out.push({
        kind: 'global',
        variableId: v.id,
        name: v.key.trim(),
        value: v.secret ? null : v.value,
        secret: v.secret ?? false,
      });
    }
    for (const d of listDynamicVariables()) {
      out.push({ kind: 'dynamic', name: d.name, description: d.description });
    }
    return out;
  }, [activeEnv, globalVariables]);

  const [highlighted, setHighlighted] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [allOpen, setAllOpen] = useState(false);

  // Derive: force-open "All" section when deep-link targets var outside used list.
  const forceAllOpen = useMemo(() => {
    if (!focusVar) return false;
    return !resolvedUsed.some(r => r.name === focusVar.name);
  }, [focusVar, resolvedUsed]);
  const effectiveAllOpen = allOpen || forceAllOpen;

  useEffect(() => {
    if (!focusVar) return;
    let cleared = false;
    const raf = requestAnimationFrame(() => {
      if (cleared) return;
      const el = rowRefs.current.get(focusVar.name);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlighted(focusVar.name);
    });
    const t = setTimeout(() => {
      setHighlighted(null);
      clearFocus();
    }, 2000);
    return () => {
      cleared = true;
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [focusVar, clearFocus]);

  return (
    <aside
      style={{ width }}
      className="flex shrink-0 flex-col border-l border-slate-800/50 bg-[var(--color-bg-secondary)]"
    >
      <header className="flex items-center justify-between border-b border-slate-800/50 px-3 py-2">
        <span className="text-xs font-semibold tracking-wider text-slate-300">
          Variables in request
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
          aria-label="Close variables panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="flex-1 overflow-auto">
        {resolvedUsed.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-500">
            No <code className="font-mono">{'{{variables}}'}</code> in this request.
          </div>
        ) : (
          resolvedUsed.map(rv => (
            <UsedVariableRow
              key={rv.name}
              resolved={rv}
              isHighlighted={highlighted === rv.name}
              rowRef={el => {
                if (el) rowRefs.current.set(rv.name, el);
                else rowRefs.current.delete(rv.name);
              }}
            />
          ))
        )}
        <CollapsibleSection
          title="All variables"
          open={effectiveAllOpen}
          onToggle={() => setAllOpen(o => !o)}
        >
          {allRows.map(row => (
            <AllVariableRow
              key={`${row.kind}-${row.name}`}
              row={row}
              isHighlighted={highlighted === row.name}
              rowRef={el => {
                if (el) rowRefs.current.set(row.name, el);
              }}
            />
          ))}
        </CollapsibleSection>
      </div>
    </aside>
  );
}

type AllRow =
  | {
      kind: 'environment';
      envId: string;
      envName: string;
      variableId: string;
      name: string;
      value: string | null;
      secret: boolean;
    }
  | {
      kind: 'global';
      variableId: string;
      name: string;
      value: string | null;
      secret: boolean;
    }
  | { kind: 'dynamic'; name: string; description: string };

function UsedVariableRow({
  resolved,
  isHighlighted,
  rowRef,
}: {
  resolved: ResolvedVariable;
  isHighlighted?: boolean;
  rowRef?: (el: HTMLElement | null) => void;
}) {
  const { name, source, value } = resolved;

  if (source.kind === 'dynamic') {
    return (
      <ReadOnlyRow
        rowRef={rowRef}
        isHighlighted={isHighlighted}
        kind="dynamic"
        name={name}
        displayValue={<DynamicValue varName={name} />}
      />
    );
  }

  if (source.kind === 'unresolved') {
    return (
      <ReadOnlyRow
        rowRef={rowRef}
        isHighlighted={isHighlighted}
        kind="unresolved"
        name={name}
        displayValue={<span className="italic text-slate-600">unresolved</span>}
      />
    );
  }

  return (
    <EditableRow
      rowRef={rowRef}
      isHighlighted={isHighlighted}
      name={name}
      source={source}
      initialValue={value}
    />
  );
}

function AllVariableRow({
  row,
  isHighlighted,
  rowRef,
}: {
  row: AllRow;
  isHighlighted?: boolean;
  rowRef?: (el: HTMLElement | null) => void;
}) {
  if (row.kind === 'dynamic') {
    return (
      <ReadOnlyRow
        rowRef={rowRef}
        isHighlighted={isHighlighted}
        kind="dynamic"
        name={row.name}
        displayValue={<DynamicValue varName={row.name} />}
      />
    );
  }

  const source: VariableSource =
    row.kind === 'environment'
      ? {
          kind: 'environment',
          envId: row.envId,
          envName: row.envName,
          variableId: row.variableId,
          secret: row.secret,
        }
      : { kind: 'global', variableId: row.variableId, secret: row.secret };

  return (
    <EditableRow
      rowRef={rowRef}
      isHighlighted={isHighlighted}
      name={row.name}
      source={source}
      initialValue={row.value}
    />
  );
}

function EditableRow({
  name,
  source,
  initialValue,
  isHighlighted,
  rowRef,
}: {
  name: string;
  source: Extract<VariableSource, { kind: 'environment' } | { kind: 'global' }>;
  initialValue: string | null;
  isHighlighted?: boolean;
  rowRef?: (el: HTMLElement | null) => void;
}) {
  const {
    draft,
    revealed,
    readOnly,
    onChange,
    onBlur,
    onCompositionStart,
    onCompositionEnd,
    toggleReveal,
  } = useVariableValueDraft({ varName: name, source, initialValue });

  const showMask = source.secret && !revealed;

  return (
    <div
      ref={rowRef}
      className={`group flex items-center gap-2 border-b border-slate-800/30 px-3 py-1.5 transition-colors focus-within:bg-white/[0.03] hover:bg-white/5 ${
        isHighlighted
          ? 'bg-[var(--color-accent)]/15 ring-1 ring-inset ring-[var(--color-accent)]'
          : ''
      }`}
    >
      <SourceBadge kind={source.kind} />
      <span
        className="w-1/3 shrink-0 truncate font-mono text-xs text-slate-200"
        title={name}
      >
        {name}
      </span>
      <input
        type={showMask ? 'password' : 'text'}
        value={showMask ? '••••••••' : draft}
        onChange={onChange}
        onBlur={onBlur}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        readOnly={readOnly}
        placeholder="empty"
        autoComplete="off"
        spellCheck={false}
        data-lpignore="true"
        className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-xs text-slate-300 outline-none transition-colors placeholder:italic placeholder:text-slate-600 hover:border-slate-700/60 focus:border-[var(--color-accent)]/60 focus:bg-[var(--color-bg-primary)] focus:text-slate-100 read-only:cursor-default read-only:hover:border-transparent"
      />
      {source.secret && (
        <button
          type="button"
          onClick={toggleReveal}
          className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
          aria-label={revealed ? 'Hide value' : 'Reveal value'}
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

function ReadOnlyRow({
  kind,
  name,
  displayValue,
  isHighlighted,
  rowRef,
}: {
  kind: VariableSource['kind'];
  name: string;
  displayValue: React.ReactNode;
  isHighlighted?: boolean;
  rowRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-2 border-b border-slate-800/30 px-3 py-1.5 hover:bg-white/5 ${
        isHighlighted
          ? 'bg-[var(--color-accent)]/15 ring-1 ring-inset ring-[var(--color-accent)]'
          : ''
      }`}
    >
      <SourceBadge kind={kind} />
      <span
        className="w-1/3 shrink-0 truncate font-mono text-xs text-slate-200"
        title={name}
      >
        {name}
      </span>
      <span className="min-w-0 flex-1 truncate px-1.5 font-mono text-xs text-slate-400">
        {displayValue}
      </span>
    </div>
  );
}

function DynamicValue({ varName }: { varName: string }) {
  const resolveDynamicValue = useEnvironmentStore(s => s.resolveDynamicValue);
  return <>{resolveDynamicValue(varName)}</>;
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-800/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-3 py-2 text-left text-xs font-semibold tracking-wider text-slate-400 hover:bg-white/5"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
