/**
 * Single history entry row: method badge, URL (truncated), status, time ago, re-run.
 */

import { memo } from 'react';
import { RotateCw } from 'lucide-react';
import type { HistoryEntry } from '../../types/models';
import { formatTimeAgo } from '../../utils/history-date-groups';
import { METHOD_COLORS } from '../../utils/method-colors';
import { statusColor } from '../../utils/status-color';

interface HistoryEntryItemProps {
  entry: HistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  onRerun: () => void;
}

export const HistoryEntryItem = memo(function HistoryEntryItem({ entry, isSelected, onSelect, onRerun }: HistoryEntryItemProps) {
  const methodColor = METHOD_COLORS[entry.method] ?? 'var(--foreground)';
  const statusCol = statusColor(entry.status_code);
  const duration = entry.response_time != null ? `${entry.response_time}ms` : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }
      }}
      className={`group relative flex flex-col gap-1 py-2 px-3 rounded-md cursor-pointer outline-none transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30'
          : 'hover:bg-white/[0.03]'
      }`}
    >
      {/* Row 1: method + URL */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 text-[10px] font-bold tracking-wide rounded px-1.5 py-0.5 text-center uppercase"
          style={{ backgroundColor: `${methodColor}15`, color: methodColor }}
        >
          {entry.method}
        </span>
        <span className="truncate text-[13px] text-slate-300 flex-1 font-mono" title={entry.url}>
          {entry.url || '—'}
        </span>
      </div>
      {/* Row 2: status + duration + time ago + re-run */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span
          className="font-medium rounded px-1 py-px"
          style={{ backgroundColor: `${statusCol}12`, color: statusCol }}
        >
          {entry.status_code}
        </span>
        {duration && <span className="text-slate-600">{duration}</span>}
        <span className="ml-auto">{formatTimeAgo(entry.timestamp)}</span>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-white/10 hover:text-[var(--color-accent)] transition-all outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50"
          onClick={e => { e.stopPropagation(); onRerun(); }}
          aria-label="Re-run request"
          title="Re-run"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});
