/**
 * Fixed-width sidebar with Collections / History / Environments tabs.
 */

import { useEffect } from 'react';
import { SidebarTabs } from '../collections/sidebar-tabs';
import { useCollectionsStore } from '../../stores/collections-store';

interface SidebarProps {
  onOpenEnvironmentManager?: () => void;
}

export function Sidebar({ onOpenEnvironmentManager }: SidebarProps) {
  const hydrateExpanded = useCollectionsStore(s => s.hydrateExpanded);

  useEffect(() => {
    void hydrateExpanded();
  }, [hydrateExpanded]);

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden bg-slate-900/50 border-r border-[var(--color-bg-tertiary)]"
      style={{ width: 260 }}
    >
      <SidebarTabs onOpenEnvironmentManager={onOpenEnvironmentManager} />
    </aside>
  );
}
