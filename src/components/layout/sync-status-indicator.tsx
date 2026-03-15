/**
 * Titlebar sync status: icon (off / idle / syncing / error) + tooltip.
 */

import { Cloud, CloudOff, Loader2, CloudAlert } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';

interface SyncStatusIndicatorProps {
  onOpenSyncSettings?: () => void;
}

export function SyncStatusIndicator({ onOpenSyncSettings }: SyncStatusIndicatorProps) {
  const config = useSyncStore(s => s.config);
  const status = useSyncStore(s => s.status);
  const lastSyncAt = useSyncStore(s => s.lastSyncAt);
  const error = useSyncStore(s => s.error);
  const syncAll = useSyncStore(s => s.syncAll);

  const enabled = config?.enabled ?? false;

  const title = (() => {
    if (!enabled) return 'Cloud sync disabled';
    if (status === 'syncing') return 'Syncing…';
    if (status === 'error' && error) return error;
    if (lastSyncAt) return `Last synced: ${new Date(lastSyncAt).toLocaleString()}`;
    return 'Cloud sync ready';
  })();

  const handleClick = () => {
    if (onOpenSyncSettings) onOpenSyncSettings();
    else if (enabled && status !== 'syncing') void syncAll();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      aria-label={title}
      className="flex items-center gap-1 rounded px-2 py-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
    >
      {!enabled && <CloudOff className="h-3.5 w-3.5" />}
      {enabled && status === 'idle' && <Cloud className="h-3.5 w-3.5" />}
      {enabled && status === 'syncing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {enabled && status === 'error' && <CloudAlert className="h-3.5 w-3.5 text-amber-400" />}
    </button>
  );
}
