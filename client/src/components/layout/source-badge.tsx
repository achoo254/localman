/**
 * Small colored badge letter for variable source kind.
 * E = Environment (blue), G = Global (yellow), $ = Dynamic (slate), U = Unresolved (red).
 */

import type { VariableSource } from '../../stores/environment-store';

const MAP: Record<VariableSource['kind'], { letter: string; bg: string }> = {
  environment: { letter: 'E', bg: 'bg-blue-500' },
  global: { letter: 'G', bg: 'bg-yellow-500' },
  dynamic: { letter: '$', bg: 'bg-slate-500' },
  unresolved: { letter: 'U', bg: 'bg-red-500' },
};

interface SourceBadgeProps {
  kind: VariableSource['kind'];
  size?: 'sm' | 'md';
}

export function SourceBadge({ kind, size = 'sm' }: SourceBadgeProps) {
  const { letter, bg } = MAP[kind];
  const cls = size === 'sm' ? 'h-4 w-4 text-[9px]' : 'h-5 w-5 text-[length:var(--text-meta)]';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[var(--color-text-on-accent)] ${bg} ${cls}`}
    >
      {letter}
    </span>
  );
}
