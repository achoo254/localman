/**
 * Cloud Sync settings: auth and manual sync trigger.
 */

import { useEffect } from 'react'
import { Cloud, Loader2 } from 'lucide-react'
import { useSyncStore } from '../../stores/sync-store'
import { CloudLoginForm } from './cloud-login-form'
import { FEATURES } from '../../utils/feature-flags'

export function SyncSettings() {
  const {
    config,
    status,
    loadConfig,
    syncAll,
    clearError,
  } = useSyncStore()

  useEffect(() => {
    if (FEATURES.CLOUD_SYNC) void loadConfig()
  }, [loadConfig])

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Cloud Sync</h2>
      <p className="text-xs text-slate-500">
        Sign in with Google to sync collections and environments across devices.
      </p>

      {/* Cloud Auth + Sync */}
      <CloudLoginForm />

      {/* Manual sync */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => { clearError(); void syncAll() }}
          disabled={!FEATURES.CLOUD_SYNC || !config.userEmail || status === 'syncing'}
          className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {status === 'syncing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
          Sync now
        </button>
        {!FEATURES.CLOUD_SYNC && (
          <span className="text-xs text-slate-500">Coming Soon</span>
        )}
      </div>
    </div>
  )
}
