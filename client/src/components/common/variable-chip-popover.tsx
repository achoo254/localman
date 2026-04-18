/**
 * Popover triggered by clicking a `{{var}}` chip in URL/headers/body/auth.
 * Renders 4 modes based on source: environment, global, dynamic, unresolved.
 *
 * [RED TEAM C2] Secret value fetched on-demand via resolveVariableSource({reveal:true}),
 *   never stored in fiber until user clicks Eye.
 * [RED TEAM C4] Debounced write captures {envId, variableId} at blur time;
 *   cleanup cancels timer on unmount; active-env verified before commit.
 * [RED TEAM H12] name validation before createVariable; invalid names show error state.
 * [RED TEAM M15] Blur handler guards IME composition.
 */

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useEnvironmentStore, type VariableSource } from '../../stores/environment-store';
import { useVariableValueDraft } from '../../hooks/use-variable-value-draft';

const MASK = '••••••••';
const VARIABLE_NAME_REGEX = /^[a-zA-Z0-9_$.-]+$/;
const FORBIDDEN_NAMES = new Set(['__proto__', 'constructor', 'prototype', '']);

function isValidName(n: string): boolean {
  return !!n && !FORBIDDEN_NAMES.has(n) && VARIABLE_NAME_REGEX.test(n);
}

interface VariableChipPopoverProps {
  varName: string;
  onOpenVariablesPanel?: (name: string) => void;
  children: React.ReactNode;
}

export function VariableChipPopover({
  varName,
  onOpenVariablesPanel,
  children,
}: VariableChipPopoverProps) {
  const [open, setOpen] = useState(false);
  const resolveVariableSource = useEnvironmentStore(s => s.resolveVariableSource);
  const resolveDynamicValue = useEnvironmentStore(s => s.resolveDynamicValue);

  // Re-subscribe on env changes so popover reflects live state while open.
  const environments = useEnvironmentStore(s => s.environments);
  const globalVariables = useEnvironmentStore(s => s.globalVariables);

  const resolved = open ? resolveVariableSource(varName) : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <span
          onClick={e => {
            // [RED TEAM H6] Stop bubbling so parent overlay onClick doesn't
            // unmount trigger / refocus input before popover opens.
            e.stopPropagation();
          }}
          onMouseDown={e => e.stopPropagation()}
          className="cursor-pointer rounded px-0.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
        >
          {children}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 flex w-[360px] max-w-[360px] flex-col gap-2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-2 shadow-lg"
        >
          {resolved && (
            <ChipBody
              key={`${varName}-${environments.length}-${globalVariables.length}`}
              varName={varName}
              source={resolved.source}
              initialValue={resolved.value}
              onOpenVariablesPanel={onOpenVariablesPanel}
              resolveDynamicValue={resolveDynamicValue}
              onClose={() => setOpen(false)}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface ChipBodyProps {
  varName: string;
  source: VariableSource;
  initialValue: string | null;
  onOpenVariablesPanel?: (name: string) => void;
  resolveDynamicValue: (name: string) => string;
  onClose: () => void;
}

function ChipBody({
  varName,
  source,
  initialValue,
  onOpenVariablesPanel,
  resolveDynamicValue,
  onClose,
}: ChipBodyProps) {
  if (source.kind === 'dynamic') {
    return <DynamicBody varName={varName} description={source.description} resolveDynamicValue={resolveDynamicValue} onOpenVariablesPanel={onOpenVariablesPanel} onClose={onClose} />;
  }
  if (source.kind === 'unresolved') {
    return <UnresolvedBody varName={varName} onClose={onClose} />;
  }
  return (
    <EditableBody
      varName={varName}
      source={source}
      initialValue={initialValue}
      onOpenVariablesPanel={onOpenVariablesPanel}
      onClose={onClose}
    />
  );
}

function EditableBody({
  varName,
  source,
  initialValue,
  onOpenVariablesPanel,
  onClose,
}: {
  varName: string;
  source: Extract<VariableSource, { kind: 'environment' } | { kind: 'global' }>;
  initialValue: string | null;
  onOpenVariablesPanel?: (name: string) => void;
  onClose: () => void;
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
  } = useVariableValueDraft({ varName, source, initialValue });

  const showMask = source.secret && !revealed;
  const sourceLabel =
    source.kind === 'environment' ? `Environment: ${source.envName}` : 'Global';

  return (
    <>
      <div className="flex items-center gap-1">
        <input
          type={showMask ? 'password' : 'text'}
          value={showMask ? MASK : draft}
          onChange={onChange}
          onBlur={onBlur}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          readOnly={readOnly}
          autoComplete="off"
          data-lpignore="true"
          spellCheck={false}
          className="flex-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
        />
        {source.secret && (
          <button
            type="button"
            onClick={toggleReveal}
            className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
            aria-label={revealed ? 'Hide value' : 'Reveal value'}
            title={revealed ? 'Hide' : 'Reveal'}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-[length:var(--text-xs)] text-slate-400">
        <div className="flex items-center gap-1.5">
          <SourceBadge kind={source.kind} />
          <span className="truncate text-slate-300">{sourceLabel}</span>
        </div>
        {onOpenVariablesPanel && (
          <button
            type="button"
            onClick={() => {
              onOpenVariablesPanel(varName);
              onClose();
            }}
            className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          >
            Variables <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}

function DynamicBody({
  varName,
  description,
  resolveDynamicValue,
  onOpenVariablesPanel,
  onClose,
}: {
  varName: string;
  description: string;
  resolveDynamicValue: (name: string) => string;
  onOpenVariablesPanel?: (name: string) => void;
  onClose: () => void;
}) {
  const preview = resolveDynamicValue(varName);
  return (
    <>
      <input
        readOnly
        tabIndex={-1}
        value={preview}
        className="w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-mono text-xs text-slate-400 outline-none"
      />
      <div className="flex items-center justify-between text-[length:var(--text-xs)] text-slate-400">
        <div className="flex items-center gap-1.5">
          <SourceBadge kind="dynamic" />
          <span className="truncate text-slate-300">Dynamic: {description}</span>
        </div>
        {onOpenVariablesPanel && (
          <button
            type="button"
            onClick={() => {
              onOpenVariablesPanel(varName);
              onClose();
            }}
            className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          >
            Variables <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}

function UnresolvedBody({ varName, onClose }: { varName: string; onClose: () => void }) {
  const createVariable = useEnvironmentStore(s => s.createVariable);
  const getActiveEnvironment = useEnvironmentStore(s => s.getActiveEnvironment);
  const [value, setValue] = useState('');
  const [target, setTarget] = useState<'environment' | 'global'>('environment');
  const [error, setError] = useState<string | null>(null);

  const activeEnv = getActiveEnvironment();
  const valid = isValidName(varName);

  const handleAdd = async () => {
    setError(null);
    if (!valid) {
      setError('Invalid variable name. Rename in source input first.');
      return;
    }
    try {
      if (target === 'environment') {
        if (!activeEnv) {
          setError('No active environment. Select one first.');
          return;
        }
        await createVariable({ kind: 'environment', envId: activeEnv.id }, varName, value);
      } else {
        await createVariable({ kind: 'global' }, varName, value);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!valid) {
    return (
      <div className="flex items-center gap-1.5 text-[length:var(--text-xs)] text-red-400">
        <SourceBadge kind="unresolved" />
        <span>Invalid variable name. Rename in source input first.</span>
      </div>
    );
  }

  return (
    <>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="New value"
        autoComplete="off"
        data-lpignore="true"
        className="w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
      />
      <div className="flex items-center justify-between gap-2 text-[length:var(--text-xs)]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <SourceBadge kind="unresolved" />
          <span>Unresolved</span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={target}
            onChange={e => setTarget(e.target.value as 'environment' | 'global')}
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-[length:var(--text-xs)] outline-none"
          >
            <option value="environment" disabled={!activeEnv}>
              {activeEnv ? `Env: ${activeEnv.name}` : 'No env'}
            </option>
            <option value="global">Global</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-[length:var(--text-xs)] font-medium text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]"
          >
            Add
          </button>
        </div>
      </div>
      {error && <div className="text-[length:var(--text-xs)] text-red-400">{error}</div>}
    </>
  );
}

function SourceBadge({ kind }: { kind: VariableSource['kind'] }) {
  const map: Record<VariableSource['kind'], { letter: string; bg: string }> = {
    environment: { letter: 'E', bg: 'bg-blue-500' },
    global: { letter: 'G', bg: 'bg-yellow-500' },
    dynamic: { letter: '$', bg: 'bg-slate-500' },
    unresolved: { letter: 'U', bg: 'bg-red-500' },
  };
  const { letter, bg } = map[kind];
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-[var(--color-text-on-accent)] ${bg}`}
    >
      {letter}
    </span>
  );
}
