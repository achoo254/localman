/**
 * History sidebar tab: filters, entries grouped by date, load more, clear.
 */

import { useEffect, useMemo } from 'react';
import { confirm } from '@tauri-apps/plugin-dialog';
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
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--color-bg-tertiary)]">
        <span className="text-xs font-medium text-slate-500">History</span>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-red-400"
          onClick={handleClear}
        >
          Clear all
        </button>
      </div>
      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
        {entries.length === 0 && !isLoading ? (
          <p className="p-4 text-sm text-slate-500">No history yet. Send a request to log it.</p>
        ) : (
          <>
            {order.map(key => {
              const list = grouped.get(key) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={key}>
                  <HistoryDateGroup groupKey={key} />
                  <div className="px-2 py-1 space-y-0.5">
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
                  className="w-full rounded-lg border border-dashed border-slate-600 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500"
                  onClick={() => void loadEntries(true)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
