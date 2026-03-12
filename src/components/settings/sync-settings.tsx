/**
 * Cloud Sync settings: server URL, auth, and manual sync trigger.
 */

import { useEffect } from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';
import { CloudLoginForm } from './cloud-login-form';
import type { CloudSyncConfig } from '../../types/cloud-sync';

export function SyncSettings() {
  const {
    config,
    status,
    loadConfig,
    saveConfig,
    syncAll,
    clearError,
  } = useSyncStore();

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const updateCloud = (patch: Partial<CloudSyncConfig>) => {
    const next = { ...config, ...patch };
    void saveConfig(next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Cloud Sync</h2>
      <p className="text-xs text-slate-500">
        Sync collections and environments to your Localman server.
      </p>

      {/* Server URL */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Server URL</span>
        <input
          type="url"
          value={config.serverUrl}
          onChange={e => updateCloud({ serverUrl: e.target.value })}
          placeholder="https://api.localman.app"
          className="flex-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>

      {/* Cloud Auth + Sync */}
      <CloudLoginForm />

      {/* Manual sync */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => { clearError(); void syncAll(); }}
          disabled={!config.token || status === 'syncing'}
          className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {status === 'syncing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
          Sync now
        </button>
      </div>
    </div>
  );
}
