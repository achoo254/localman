/**
 * Sidebar with Collections / History / Environments tabs. Collapsible for more space.
 * Header shows workspace switcher + presence avatars when authenticated.
 */

import { useEffect } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { SidebarTabs } from '../collections/sidebar-tabs';
import { useCollectionsStore } from '../../stores/collections-store';
import { WorkspaceSwitcher } from './workspace-switcher';
import { PresenceAvatars } from '../common/presence-avatars';
import { SyncStatusBadge } from '../common/sync-status-badge';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useSyncStore } from '../../stores/sync-store';

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  collapsed?: boolean;
  /** When expanded, use this width (px). If omitted, falls back to SIDEBAR_WIDTH. */
  width?: number;
  onToggleCollapsed?: () => void;
  onOpenEnvironmentManager?: () => void;
}

export function Sidebar({
  collapsed = false,
  width,
  onToggleCollapsed,
  onOpenEnvironmentManager,
}: SidebarProps) {
  const hydrateExpanded = useCollectionsStore(s => s.hydrateExpanded);
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const isAuthenticated = useSyncStore(s => s.isAuthenticated());

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

  const effectiveWidth = width ?? SIDEBAR_WIDTH;
  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden bg-slate-900/50 border-r border-[var(--color-bg-tertiary)]"
      style={{ width: effectiveWidth }}
    >
      {/* Header: workspace switcher + presence + collapse button */}
      <div className="flex items-center gap-1 border-b border-[var(--color-bg-tertiary)] px-1 py-1 min-w-0">
        <div className="flex-1 min-w-0">
          <WorkspaceSwitcher />
        </div>
        {isAuthenticated && activeWorkspaceId && (
          <PresenceAvatars
            workspaceId={activeWorkspaceId}
            maxVisible={2}
            avatarSize={20}
          />
        )}
        <SyncStatusBadge />
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded p-1.5 text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)] shrink-0"
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
