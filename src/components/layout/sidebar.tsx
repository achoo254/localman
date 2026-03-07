/**
 * Sidebar with Collections / History / Environments tabs. Collapsible for more space.
 */

import { useEffect } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { SidebarTabs } from '../collections/sidebar-tabs';
import { useCollectionsStore } from '../../stores/collections-store';

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenEnvironmentManager?: () => void;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onOpenEnvironmentManager,
}: SidebarProps) {
  const hydrateExpanded = useCollectionsStore(s => s.hydrateExpanded);

  useEffect(() => {
    void hydrateExpanded();
  }, [hydrateExpanded]);

  if (collapsed) {
    return (
      <aside
        className="flex shrink-0 flex-col items-center border-r border-[var(--color-bg-tertiary)] bg-slate-900/50 py-2"
        style={{ width: 40 }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded p-2 text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)]"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelRightOpen size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden bg-slate-900/50 border-r border-[var(--color-bg-tertiary)]"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="flex items-center justify-end border-b border-[var(--color-bg-tertiary)] px-1 py-1">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded p-1.5 text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)]"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelRightClose size={18} />
        </button>
      </div>
      <SidebarTabs onOpenEnvironmentManager={onOpenEnvironmentManager} />
    </aside>
  );
}
