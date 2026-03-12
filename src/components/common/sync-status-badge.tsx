/**
 * Sync status badge — icon showing sync state and conflict count.
 * States: synced (green), syncing (spinner), error (red), offline (gray).
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';
import { useConflictStore } from '../../stores/conflict-store';

interface SyncStatusBadgeProps {
  onClick?: () => void;
}

export function SyncStatusBadge({ onClick }: SyncStatusBadgeProps) {
  const status = useSyncStore(s => s.status);
  const wsState = useSyncStore(s => s.wsState);
  const lastSyncAt = useSyncStore(s => s.lastSyncAt);
  const isAuthenticated = useSyncStore(s => s.isAuthenticated());
  const conflicts = useConflictStore(s => s.conflicts);
  const conflictCount = conflicts.length;

  if (!isAuthenticated) return null;

  const isOffline = wsState === 'disconnected';

  function getIcon() {
    if (status === 'syncing') {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />;
    }
    if (status === 'error') {
      return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    }
    if (isOffline) {
      return <CloudOff className="h-3.5 w-3.5 text-slate-500" />;
    }
    return <Cloud className="h-3.5 w-3.5 text-emerald-400" />;
  }

  function getTooltipText() {
    if (status === 'syncing') return 'Syncing…';
    if (status === 'error') return 'Sync error — click to view';
    if (isOffline) return 'Offline — changes will sync when reconnected';
    if (lastSyncAt) return `Synced ${new Date(lastSyncAt).toLocaleTimeString()}`;
    return 'Connected';
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="relative flex items-center justify-center rounded p-1 hover:bg-[var(--color-bg-tertiary)] transition-colors"
            aria-label="Sync status"
          >
            {getIcon()}
            {conflictCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {conflictCount > 9 ? '9+' : conflictCount}
              </span>
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-slate-200 shadow-md border border-[var(--color-bg-tertiary)]"
            sideOffset={4}
          >
            {getTooltipText()}
            {conflictCount > 0 && (
              <span className="ml-1 text-red-400">· {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
            )}
            <Tooltip.Arrow className="fill-[var(--color-bg-tertiary)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
