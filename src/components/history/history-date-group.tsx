/**
 * Date group header for history list (Today, Yesterday, Last 7 days, Older).
 */

import type { DateGroupKey } from '../../utils/history-date-groups';
import { getDateGroupLabel } from '../../utils/history-date-groups';

interface HistoryDateGroupProps {
  groupKey: DateGroupKey;
}

export function HistoryDateGroup({ groupKey }: HistoryDateGroupProps) {
  return (
    <div className="sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-bg-primary)] border-b border-[var(--color-bg-tertiary)]">
      {getDateGroupLabel(groupKey)}
    </div>
  );
}
