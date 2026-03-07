/**
 * Single history entry row: method badge, URL (truncated), status, time ago.
 */

import type { HistoryEntry } from '../../types/models';
import { formatTimeAgo } from '../../utils/history-date-groups';

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  PATCH: 'var(--color-method-patch)',
  DELETE: 'var(--color-method-delete)',
  HEAD: 'var(--color-method-get)',
  OPTIONS: 'var(--color-method-get)',
};

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-method-get)';
  if (status >= 300 && status < 400) return '#3b82f6';
  if (status >= 400 && status < 500) return 'var(--color-method-post)';
  if (status >= 500) return 'var(--color-method-delete)';
  return 'var(--foreground)';
}

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

export function HistoryEntryItem({ entry, isSelected, onSelect, onRerun }: HistoryEntryItemProps) {
  const methodColor = METHOD_COLORS[entry.method] ?? 'var(--foreground)';
  const statusCol = statusColor(entry.status_code);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`flex flex-col gap-0.5 py-2 px-3 cursor-pointer rounded-lg min-h-0 border-l-2 transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
          : 'border-transparent hover:bg-[var(--color-bg-tertiary)]'
      }`}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
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
        <button
          type="button"
          className="text-slate-400 hover:text-[var(--color-accent)]"
          onClick={e => {
            e.stopPropagation();
            onRerun();
          }}
          title="Re-run request"
        >
          Re-run
        </button>
      </div>
    </div>
  );
}
