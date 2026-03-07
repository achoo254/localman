/**
 * Resizable sidebar with Collections / History / Environments tabs.
 */

import { useEffect } from 'react';
import { SidebarTabs } from '../collections/sidebar-tabs';
import { useCollectionsStore } from '../../stores/collections-store';

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

export function Sidebar() {
  const hydrateExpanded = useCollectionsStore(s => s.hydrateExpanded);

  useEffect(() => {
    void hydrateExpanded();
  }, [hydrateExpanded]);

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden"
      style={{
        width: DEFAULT_WIDTH,
        minWidth: MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-bg-tertiary)',
      }}
    >
      <SidebarTabs />
    </aside>
  );
}
