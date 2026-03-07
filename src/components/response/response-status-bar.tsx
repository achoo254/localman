/**
 * Response status code badge, time, and size.
 */

import type { ResponseData } from '../../types/response';

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-method-get)';
  if (status >= 300 && status < 400) return '#3b82f6';
  if (status >= 400 && status < 500) return 'var(--color-method-post)';
  if (status >= 500) return 'var(--color-method-delete)';
  return 'var(--foreground)';
}

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
    <div className="flex items-center gap-3 border-b border-[var(--color-bg-tertiary)] px-2 py-1.5 text-sm">
      <span
        className="rounded px-2 py-0.5 font-medium"
        style={{ backgroundColor: `${statusColor(data.status)}20`, color: statusColor(data.status) }}
      >
        {data.status} {data.statusText}
      </span>
      <span className="text-gray-400">{data.responseTime} ms</span>
      <span className="text-gray-400">{formatSize(data.bodySize)}</span>
    </div>
  );
}
