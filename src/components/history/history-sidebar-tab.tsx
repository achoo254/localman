/**
 * History sidebar tab: filters, entries grouped by date, load more, clear.
 */

import { useEffect, useMemo } from 'react';
import { confirm } from '@tauri-apps/plugin-dialog';
import { Clock, Trash2, Loader2 } from 'lucide-react';
import { useHistoryStore } from '../../stores/history-store';
import { getDateGroupKey, type DateGroupKey } from '../../utils/history-date-groups';
import { HistoryFiltersBar } from './history-filters';
import { HistoryDateGroup } from './history-date-group';
import { HistoryEntryItem } from './history-entry-item';
import type { HistoryEntry } from '../../types/models';

function groupEntriesByDate(entries: HistoryEntry[]): Map<DateGroupKey, HistoryEntry[]> {
  const map = new Map<DateGroupKey, HistoryEntry[]>();
  const order: DateGroupKey[] = ['today', 'yesterday', 'last7', 'older'];
  for (const key of order) map.set(key, []);
  for (const e of entries) {
    const key = getDateGroupKey(e.timestamp);
    map.get(key)!.push(e);
  }
  return map;
}

export function HistorySidebarTab() {
  const entries = useHistoryStore(s => s.entries);
  const selectedEntry = useHistoryStore(s => s.selectedEntry);
  const isLoading = useHistoryStore(s => s.isLoading);
  const hasMore = useHistoryStore(s => s.hasMore);
  const loadEntries = useHistoryStore(s => s.loadEntries);
  const setSelectedEntry = useHistoryStore(s => s.setSelectedEntry);
  const clearHistory = useHistoryStore(s => s.clearHistory);
  const rerunEntry = useHistoryStore(s => s.rerunEntry);

  useEffect(() => {
    void loadEntries(false);
  }, [loadEntries]);

  const grouped = useMemo(() => groupEntriesByDate(entries), [entries]);
  const order: DateGroupKey[] = ['today', 'yesterday', 'last7', 'older'];

  const handleClear = async () => {
    if (await confirm('Clear all history? This cannot be undone.')) {
      void clearHistory();
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <HistoryFiltersBar />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-bg-tertiary)]">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">History</span>
          {entries.length > 0 && (
            <span className="text-[10px] text-slate-600 bg-slate-800 rounded-full px-1.5 py-0.5 font-medium leading-none">
              {entries.length}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
            onClick={handleClear}
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      {/* List */}
      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
        {entries.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
            <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 font-medium">No history yet</p>
              <p className="text-xs text-slate-600 mt-1">Send a request to start logging</p>
            </div>
          </div>
        ) : (
          <>
            {order.map(key => {
              const list = grouped.get(key) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={key}>
                  <HistoryDateGroup groupKey={key} count={list.length} />
                  <div className="px-1.5 py-1 space-y-px">
                    {list.map(entry => (
                      <HistoryEntryItem
                        key={entry.id ?? entry.timestamp + entry.url}
                        entry={entry}
                        isSelected={selectedEntry?.id === entry.id}
                        onSelect={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                        onRerun={() => void rerunEntry(entry)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div className="p-2">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-700 py-2 text-[11px] text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors cursor-pointer disabled:opacity-50"
                  onClick={() => void loadEntries(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
