/**
 * Horizontal tab bar for multiple open requests.
 */

import { useRequestStore } from '../../stores/request-store';
import type { HttpMethod } from '../../types/enums';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  PATCH: 'var(--color-method-patch)',
  DELETE: 'var(--color-method-delete)',
  HEAD: 'var(--color-method-get)',
  OPTIONS: 'var(--color-method-get)',
};

export function RequestTabBar() {
  const openTabs = useRequestStore(s => s.openTabs);
  const activeTabId = useRequestStore(s => s.activeTabId);
  const setActiveTab = useRequestStore(s => s.setActiveTab);
  const closeTab = useRequestStore(s => s.closeTab);

  if (openTabs.length === 0) {
    return (
      <div className="border-b border-[var(--color-bg-tertiary)] px-4 py-2 text-sm text-gray-500">
        No request open — create or open a request from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex border-b border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]">
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
          className={`flex cursor-pointer items-center gap-2 border-r border-[var(--color-bg-tertiary)] px-3 py-2 text-sm ${
            activeTabId === tab.id
              ? 'bg-[var(--color-bg-primary)] text-[var(--foreground)]'
              : 'text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
          }`}
        >
          <span
            className="font-mono font-medium"
            style={{ color: METHOD_COLORS[tab.method] }}
          >
            {tab.method}
          </span>
          <span className="max-w-[120px] truncate">{tab.name}</span>
          {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="rounded p-0.5 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)]"
            aria-label="Close tab"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
