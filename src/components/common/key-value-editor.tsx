/**
 * Reusable key-value table for params, headers, form data.
 */

import { useCallback } from 'react';
import type { KeyValuePair } from '../../types/common';
import { newId } from '../../db/utils';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  showDescription?: boolean;
}

export function KeyValueEditor({
  pairs,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
  showDescription = false,
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
            <th className="w-8 py-1.5 text-left font-medium text-gray-400"> </th>
            <th className="p-1.5 text-left font-medium text-gray-400">{placeholderKey}</th>
            <th className="p-1.5 text-left font-medium text-gray-400">{placeholderValue}</th>
            {showDescription && (
              <th className="p-1.5 text-left font-medium text-gray-400">Description</th>
            )}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {pairs.map((p, idx) => (
            <tr key={p.id} className="border-b border-[var(--color-bg-tertiary)]/50">
              <td className="py-1">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={e => update(idx, { enabled: e.target.checked })}
                  className="rounded border-gray-600 bg-[var(--color-bg-secondary)]"
                />
              </td>
              <td className="p-1">
                <input
                  value={p.key}
                  onChange={e => update(idx, { key: e.target.value })}
                  placeholder={placeholderKey}
                  className="w-full rounded bg-[var(--color-bg-secondary)] px-2 py-1.5 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </td>
              <td className="p-1">
                <input
                  value={p.value}
                  onChange={e => update(idx, { value: e.target.value })}
                  placeholder={placeholderValue}
                  className="w-full rounded bg-[var(--color-bg-secondary)] px-2 py-1.5 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </td>
              {showDescription && (
                <td className="p-1">
                  <input
                    value={p.description ?? ''}
                    onChange={e => update(idx, { description: e.target.value })}
                    placeholder="Description"
                    className="w-full rounded bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm outline-none"
                  />
                </td>
              )}
              <td className="py-1">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded p-1 text-gray-400 hover:bg-[var(--color-bg-tertiary)] hover:text-red-400"
                  aria-label="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addRow}
        className="self-start rounded px-2 py-1 text-sm text-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)]"
      >
        + Add row
      </button>
    </div>
  );
}
