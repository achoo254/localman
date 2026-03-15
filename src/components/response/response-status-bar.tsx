/**
 * Response status code badge, time, and size.
 */

import type { ResponseData } from '../../types/response';
import { statusColor } from '../../utils/status-color';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ResponseStatusBarProps {
  data: ResponseData;
}

export function ResponseStatusBar({ data }: ResponseStatusBarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-bg-tertiary)] px-4 py-2.5 text-sm bg-[var(--color-bg-secondary)] shadow-sm z-10">
      <span
        className="rounded px-2.5 py-1 font-semibold text-xs tracking-wide shadow-sm"
        style={{ backgroundColor: `${statusColor(data.status)}20`, color: statusColor(data.status) }}
      >
        {data.status} {data.statusText}
      </span>
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>{data.responseTime} ms</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium border-l border-[var(--color-bg-tertiary)] pl-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        <span>{formatSize(data.bodySize)}</span>
      </div>
    </div>
  );
}
