/**
 * Date group header for history list (Today, Yesterday, Last 7 days, Older).
 */

import { Calendar, Clock, CalendarDays, Archive } from 'lucide-react';
import type { DateGroupKey } from '../../utils/history-date-groups';
import { getDateGroupLabel } from '../../utils/history-date-groups';

const GROUP_ICONS: Record<DateGroupKey, typeof Calendar> = {
  today: Clock,
  yesterday: Calendar,
  last7: CalendarDays,
  older: Archive,
};

interface HistoryDateGroupProps {
  groupKey: DateGroupKey;
  count?: number;
}

export function HistoryDateGroup({ groupKey, count }: HistoryDateGroupProps) {
  const Icon = GROUP_ICONS[groupKey];
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm border-b border-[var(--color-bg-tertiary)]">
      <Icon className="w-3 h-3 text-slate-500" />
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        {getDateGroupLabel(groupKey)}
      </span>
      {count != null && count > 0 && (
        <span className="text-[10px] text-slate-600 bg-slate-800 rounded-full px-1.5 py-0.5 font-medium leading-none">
          {count}
        </span>
      )}
    </div>
  );
}
