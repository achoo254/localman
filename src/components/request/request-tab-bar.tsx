/**
 * Horizontal tab bar for multiple open requests with draft support.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { isTauri } from '../../utils/tauri-http-client';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRequestStore } from '../../stores/request-store';
import { hasMeaningfulContent } from './draft-utils';
import { METHOD_COLORS } from '../../utils/method-colors';

interface RequestTabBarProps {
  onRequestSaveDialog?: (tabId: string) => void;
}

export function RequestTabBar({ onRequestSaveDialog }: RequestTabBarProps) {
  const openTabs = useRequestStore(s => s.openTabs);
  const activeTabId = useRequestStore(s => s.activeTabId);
  const setActiveTab = useRequestStore(s => s.setActiveTab);
  const closeTab = useRequestStore(s => s.closeTab);
  const createDraftTab = useRequestStore(s => s.createDraftTab);
  const drafts = useRequestStore(s => s.drafts);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, openTabs.length]);

  // Keep active tab in view
  useEffect(() => {
    if (scrollRef.current && activeTabId) {
      const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement;
      if (activeEl) {
        const container = scrollRef.current;
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeEl.getBoundingClientRect();
        
        if (tabRect.left < containerRect.left) {
          container.scrollBy({ left: tabRect.left - containerRect.left - 20, behavior: 'smooth' });
        } else if (tabRect.right > containerRect.right) {
          container.scrollBy({ left: tabRect.right - containerRect.right + 20, behavior: 'smooth' });
        }
      }
    }
  }, [activeTabId]);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && e.deltaY !== 0) {
      // Use wheel delta to scroll horizontally if scrolling vertically on tab bar
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.isDraft) {
      const draft = drafts[tabId];
      if (draft && hasMeaningfulContent(draft)) {
        let shouldSave;
        if (isTauri()) {
          const { confirm } = await import('@tauri-apps/plugin-dialog');
          shouldSave = await confirm(
            'This request has unsaved changes. Save before closing?',
            { title: 'Save request?', okLabel: 'Save', cancelLabel: "Don't Save" }
          );
        } else {
          shouldSave = window.confirm('This request has unsaved changes. Save before closing?');
        }
        if (shouldSave) {
          onRequestSaveDialog?.(tabId);
          return; // Don't close — save dialog handles it
        }
      }
    }
    closeTab(tabId);
  }, [openTabs, drafts, closeTab, onRequestSaveDialog]);

  if (openTabs.length === 0) {
    return (
      <div className="flex border-b border-[var(--color-bg-tertiary)] h-[37px] bg-[#0B1120] items-center px-1">
        <button
          type="button"
          onClick={() => createDraftTab()}
          className="shrink-0 p-2 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="New tab"
          title="New request (Ctrl+T)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex relative border-b border-[var(--color-bg-tertiary)] bg-[#0B1120] h-[37px] min-w-0 w-full group">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center bg-gradient-to-r from-[#0B1120] via-[#0B1120] to-transparent w-10 z-10 pl-1 pt-1">
          <button
            type="button"
            onClick={handleScrollLeft}
            className="p-1 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-slate-400 hover:text-slate-200 border border-[var(--color-bg-tertiary)] shadow-sm self-center"
            title="Scroll left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        onWheel={onWheel}
        className="flex-1 flex pt-1 px-1 gap-1 overflow-x-auto select-none scrollbar-none items-end min-w-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {openTabs.map(tab => (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            role="tab"
            tabIndex={0}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab(tab.id);
              }
            }}
            className={`flex group/tab cursor-pointer items-center min-w-[120px] max-w-[200px] gap-2 rounded-t-lg border-t border-x px-3 py-2 text-sm transition-colors shrink-0 ${
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
            <span className={`max-w-[120px] truncate ${tab.isDraft ? 'italic text-slate-400' : ''}`}>
              {tab.name}
            </span>
            <div className="flex-1 min-w-0" />
            {tab.isDirty && (
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tab.isDraft ? 'border border-[var(--color-accent)] bg-transparent' : 'bg-[var(--color-accent)]'}`} />
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                void handleCloseTab(tab.id);
              }}
              className={`rounded-md p-0.5 transition-colors shrink-0 ${activeTabId === tab.id ? 'opacity-100 hover:bg-slate-700/50 hover:text-white' : 'opacity-0 group-hover/tab:opacity-100 hover:bg-slate-700/50 hover:text-white'}`}
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 shrink-0 bg-[#0B1120] pl-1 pr-1 h-full shadow-[-8px_0_12px_rgba(11,17,32,1)] z-10 pt-1">
        {canScrollRight && (
          <button
            type="button"
            onClick={handleScrollRight}
            className="p-1 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-slate-400 hover:text-slate-200 border border-[var(--color-bg-tertiary)] shadow-sm self-center"
            title="Scroll right"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => createDraftTab()}
          className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors self-center border border-transparent"
          aria-label="New request"
          title="New request (Ctrl+T)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
