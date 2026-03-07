/**
 * History filter controls: method, status range, URL pattern.
 */

import { useCallback, useState } from 'react';
import type { HttpMethod } from '../../types/enums';
import { useHistoryStore } from '../../stores/history-store';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const STATUS_RANGES = [
  { value: '2', label: '2xx' },
  { value: '3', label: '3xx' },
  { value: '4', label: '4xx' },
  { value: '5', label: '5xx' },
];

export function HistoryFiltersBar() {
  const filters = useHistoryStore(s => s.filters);
  const setFilter = useHistoryStore(s => s.setFilter);
  const [urlInput, setUrlInput] = useState(filters.urlPattern ?? '');

  const applyUrlFilter = useCallback(() => {
    setFilter({ urlPattern: urlInput.trim() || undefined });
  }, [urlInput, setFilter]);

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyUrlFilter();
  };

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] text-sm text-slate-300 px-2 py-1.5 min-w-0 max-w-[100px]"
          value={filters.method ?? ''}
          onChange={e => setFilter({ method: (e.target.value || undefined) as HttpMethod | undefined })}
          aria-label="Filter by method"
        >
          <option value="">All methods</option>
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_RANGES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statusRanges?.includes(value) ?? false}
                onChange={e => {
                  const next = filters.statusRanges ?? [];
                  const set = new Set(next);
                  if (e.target.checked) set.add(value);
                  else set.delete(value);
                  setFilter({ statusRanges: set.size ? Array.from(set) : undefined });
                }}
                className="rounded border-slate-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter by URL..."
          className="flex-1 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] text-sm text-slate-300 px-2 py-1.5 placeholder-slate-500 min-w-0"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onBlur={applyUrlFilter}
          onKeyDown={handleUrlKeyDown}
          aria-label="Filter by URL"
        />
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5"
          onClick={applyUrlFilter}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
