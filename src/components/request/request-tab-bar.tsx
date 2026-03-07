/**
 * Horizontal tab bar for multiple open requests.
 */

import { useRequestStore } from '../../stores/request-store';
import { METHOD_COLORS } from '../../utils/method-colors';

export function RequestTabBar() {
  const openTabs = useRequestStore(s => s.openTabs);
  const activeTabId = useRequestStore(s => s.activeTabId);
  const setActiveTab = useRequestStore(s => s.setActiveTab);
  const closeTab = useRequestStore(s => s.closeTab);

  if (openTabs.length === 0) {
    return (
      <div className="border-b border-[var(--color-bg-tertiary)] h-[37px] bg-[#0B1120]" />
    );
  }

  return (
    <div className="flex border-b border-[var(--color-bg-tertiary)] bg-[#0B1120] pt-1 px-1 gap-1 overflow-x-auto select-none scrollbar-none">
      {openTabs.map(tab => (
        <div
          key={tab.id}
          role="tab"
          tabIndex={0}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab(tab.id);
            }
          }}
          className={`flex group cursor-pointer items-center min-w-[120px] max-w-[200px] gap-2 rounded-t-lg border-t border-x px-3 py-2 text-sm transition-colors ${
            activeTabId === tab.id
              ? 'border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] text-[var(--foreground)]'
              : 'border-transparent text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200'
          }`}
        >
          <span
            className="font-mono font-medium"
            style={{ color: METHOD_COLORS[tab.method] }}
          >
            {tab.method}
          </span>
          <span className="max-w-[120px] truncate">{tab.name}</span>
          <div className="flex-1 min-w-0" />
          {tab.isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className={`rounded-md p-0.5 transition-colors shrink-0 ${activeTabId === tab.id ? 'opacity-100 hover:bg-slate-700/50 hover:text-white' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 hover:text-white'}`}
            aria-label="Close tab"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
