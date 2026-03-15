/**
 * History filter controls: method, status range pills, URL search.
 */

import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import type { HttpMethod } from '../../types/enums';
import { useHistoryStore } from '../../stores/history-store';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const STATUS_RANGES = [
  { value: '2', label: '2xx', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { value: '3', label: '3xx', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: '4', label: '4xx', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { value: '5', label: '5xx', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
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

  const toggleStatus = (value: string) => {
    const next = filters.statusRanges ?? [];
    const set = new Set(next);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setFilter({ statusRanges: set.size ? Array.from(set) : undefined });
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 border-b border-[var(--color-bg-tertiary)]">
      {/* Method select + status pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          className="rounded-md border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] text-xs font-medium text-slate-300 pl-2 pr-6 py-1.5 min-w-0 outline-none focus:border-[var(--color-accent)]/50 transition-colors cursor-pointer"
          value={filters.method ?? ''}
          onChange={e => setFilter({ method: (e.target.value || undefined) as HttpMethod | undefined })}
          aria-label="Filter by method"
        >
          <option value="">All methods</option>
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {STATUS_RANGES.map(({ value, label, color }) => {
          const isActive = filters.statusRanges?.includes(value) ?? false;
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleStatus(value)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? color
                  : 'text-slate-500 border-transparent bg-transparent hover:text-slate-400 hover:bg-white/5'
              }`}
              aria-label={`Filter ${label} status`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>
      {/* URL search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter by URL..."
          className="w-full rounded-md border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] text-xs text-slate-300 pl-8 pr-3 py-1.5 placeholder-slate-600 outline-none focus:border-[var(--color-accent)]/50 transition-colors"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onBlur={applyUrlFilter}
          onKeyDown={handleUrlKeyDown}
          aria-label="Filter by URL"
        />
      </div>
    </div>
  );
}
