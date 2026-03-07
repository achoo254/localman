/**
 * Single history entry row: method badge, URL (truncated), status, time ago.
 */

import { memo } from 'react';
import type { HistoryEntry } from '../../types/models';
import { formatTimeAgo } from '../../utils/history-date-groups';
import { METHOD_COLORS } from '../../utils/method-colors';
import { statusColor } from '../../utils/status-color';

const MAX_URL_LEN = 50;

function truncateUrl(url: string): string {
  if (url.length <= MAX_URL_LEN) return url;
  return url.slice(0, MAX_URL_LEN) + '…';
}

interface HistoryEntryItemProps {
  entry: HistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  onRerun: () => void;
}

export const HistoryEntryItem = memo(function HistoryEntryItem({ entry, isSelected, onSelect, onRerun }: HistoryEntryItemProps) {
  const methodColor = METHOD_COLORS[entry.method] ?? 'var(--foreground)';
  const statusCol = statusColor(entry.status_code);

  return (
    <div
      className={`relative flex flex-col gap-0.5 py-2 px-3 rounded-lg min-h-0 border-l-2 group transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
          : 'border-transparent hover:bg-[var(--color-bg-tertiary)]'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className="flex flex-col gap-0.5 cursor-pointer outline-none flex-1 min-w-0 pr-12"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-12 text-xs font-medium rounded px-1.5 py-0.5 text-center"
            style={{ backgroundColor: `${methodColor}20`, color: methodColor }}
          >
            {entry.method}
          </span>
          <span className="truncate text-sm text-slate-300 flex-1" title={entry.url}>
            {truncateUrl(entry.url || '—')}
          </span>
          <span
            className="shrink-0 text-xs font-medium rounded px-1.5 py-0.5"
            style={{ backgroundColor: `${statusCol}20`, color: statusCol }}
          >
            {entry.status_code}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{formatTimeAgo(entry.timestamp)}</span>
        </div>
      </div>
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] rounded shadow-sm hover:text-[var(--color-accent)] transition-all outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        onClick={e => {
          e.stopPropagation();
          onRerun();
        }}
        aria-label="Re-run request"
        title="Re-run request"
      >
        Re-run
      </button>
    </div>
  );
});
