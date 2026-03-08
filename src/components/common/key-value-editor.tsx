/**
 * Reusable key-value table for params, headers, form data.
 * When getResolvedValue is provided, value cell uses VariableHighlightInput for {{var}} highlight + tooltip.
 */

import { useCallback } from 'react';
import type { KeyValuePair } from '../../types/common';
import { newId } from '../../db/utils';
import { VariableHighlightInput } from './variable-highlight-input';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  showDescription?: boolean;
  /** When provided, value cells use VariableHighlightInput with resolved tooltip. */
  getResolvedValue?: (value: string) => string;
}

export function KeyValueEditor({
  pairs,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
  showDescription = false,
  getResolvedValue,
}: KeyValueEditorProps) {
  const update = useCallback(
    (idx: number, patch: Partial<KeyValuePair>) => {
      const next = [...pairs];
      next[idx] = { ...next[idx], ...patch };
      onChange(next);
    },
    [pairs, onChange]
  );

  const addRow = useCallback(() => {
    onChange([...pairs, { id: newId(), key: '', value: '', enabled: true }]);
  }, [pairs, onChange]);

  const removeRow = useCallback(
    (idx: number) => {
      onChange(pairs.filter((_, i) => i !== idx));
    },
    [pairs, onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-bg-tertiary)]">
            <th className="w-8 py-2 text-left font-medium text-slate-500"> </th>
            <th className="p-2 text-left font-medium text-slate-500">{placeholderKey}</th>
            <th className="p-2 text-left font-medium text-slate-500">{placeholderValue}</th>
            {showDescription && (
              <th className="p-2 text-left font-medium text-slate-500">Description</th>
            )}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {pairs.map((p, idx) => (
            <tr key={p.id} className="group border-b border-[var(--color-bg-tertiary)]/30 hover:bg-white/[0.02]">
              <td className="py-1">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={e => update(idx, { enabled: e.target.checked })}
                  className="rounded border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
              </td>
              <td className="p-1">
                <input
                  value={p.key}
                  onChange={e => update(idx, { key: e.target.value })}
                  placeholder={placeholderKey}
                  className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-[13px] outline-none transition-colors hover:border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)]"
                />
              </td>
              <td className="p-1 min-w-0">
                {getResolvedValue ? (
                  <div className="min-w-0 w-full">
                    <VariableHighlightInput
                      value={p.value}
                      onChange={v => update(idx, { value: v })}
                      placeholder={placeholderValue}
                      getResolvedValue={() => getResolvedValue(p.value)}
                      className="py-1.5"
                    />
                  </div>
                ) : (
                  <input
                    value={p.value}
                    onChange={e => update(idx, { value: e.target.value })}
                    placeholder={placeholderValue}
                    className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-[13px] outline-none transition-colors hover:border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)]"
                  />
                )}
              </td>
              {showDescription && (
                <td className="p-1">
                  <input
                    value={p.description ?? ''}
                    onChange={e => update(idx, { description: e.target.value })}
                    placeholder="Description"
                    className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13px] outline-none transition-colors hover:border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)]"
                  />
                </td>
              )}
              <td className="py-1 text-right pr-2">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-md p-1.5 text-slate-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                  aria-label="Remove row"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 self-start rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-bg-tertiary)] flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add row
      </button>
    </div>
  );
}
