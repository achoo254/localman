/**
 * Key-value table for environment variables with secret toggle.
 */

import { useCallback, useState } from 'react';
import type { EnvVariable } from '../../types/models';
import { Eye, EyeOff } from 'lucide-react';

interface VariableTableProps {
  variables: EnvVariable[];
  onChange: (variables: EnvVariable[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const MASK = '••••••••';

export function VariableTable({
  variables,
  onChange,
  onAdd,
  onRemove,
  disabled = false,
}: VariableTableProps) {
  const update = useCallback(
    (idx: number, patch: Partial<EnvVariable>) => {
      const next = [...variables];
      next[idx] = { ...next[idx], ...patch };
      onChange(next);
    },
    [variables, onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-bg-tertiary)]">
            <th className="p-2 text-left font-medium text-slate-500">Key</th>
            <th className="p-2 text-left font-medium text-slate-500">Value</th>
            <th className="w-10 p-2" title="Reveal / hide value" />
            <th className="w-16 p-2 text-left font-medium text-slate-500">Secret</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {variables.map((v, idx) => (
            <VariableRow
              key={v.id}
              variable={v}
              onUpdate={patch => update(idx, patch)}
              onRemove={() => onRemove(v.id)}
              disabled={disabled}
            />
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="mt-2 self-start rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 flex items-center gap-1.5"
      >
        <span className="text-base leading-none">+</span>
        Add variable
      </button>
    </div>
  );
}

function VariableRow({
  variable,
  onUpdate,
  onRemove,
  disabled,
}: {
  variable: EnvVariable;
  onUpdate: (patch: Partial<EnvVariable>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  const showValue = !variable.secret || reveal;

  return (
    <tr className="group border-b border-[var(--color-bg-tertiary)]/30 hover:bg-white/[0.02]">
      <td className="p-1">
        <input
          value={variable.key}
          onChange={e => onUpdate({ key: e.target.value })}
          placeholder="Key"
          disabled={disabled}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-[13px] outline-none transition-colors hover:border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)]"
        />
      </td>
      <td className="p-1">
        <input
          type={showValue ? 'text' : 'password'}
          value={showValue ? variable.value : MASK}
          onChange={e => {
            // Reject if field is masked or value equals the mask sentinel
            if (!showValue || e.target.value === MASK) return;
            onUpdate({ value: e.target.value });
          }}
          placeholder="Value"
          disabled={disabled || (variable.secret && !reveal)}
          readOnly={variable.secret && !reveal}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-[13px] outline-none transition-colors hover:border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)]"
        />
      </td>
      <td className="p-1">
        {variable.secret && (
          <button
            type="button"
            onClick={() => setReveal(!reveal)}
            className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300"
            title={reveal ? 'Hide' : 'Reveal'}
            aria-label={reveal ? 'Hide value' : 'Reveal value'}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </td>
      <td className="p-1">
        <input
          type="checkbox"
          checked={!!variable.secret}
          onChange={e => onUpdate({ secret: e.target.checked })}
          disabled={disabled}
          className="rounded border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          title="Mask value in UI"
        />
      </td>
      <td className="py-1 pr-2 text-right">
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="rounded-md p-1.5 text-slate-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 disabled:opacity-0"
          aria-label="Remove"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
