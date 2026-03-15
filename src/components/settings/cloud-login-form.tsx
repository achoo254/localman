/**
 * Cloud login form — Google Login via Firebase Auth.
 * Shows Google sign-in button when unauthenticated, user info + sync when authenticated.
 */

import { useState } from 'react'
import { Cloud, Loader2, LogOut } from 'lucide-react'
import { useSyncStore } from '../../stores/sync-store'
import { FEATURES } from '../../utils/feature-flags'

export function CloudLoginForm() {
  const {
    config: cloudConfig,
    status,
    lastSyncAt,
    error,
    authLoading,
    loginWithGoogle,
    logout,
    syncAll,
    clearError,
  } = useSyncStore()

  const [loading, setLoading] = useState(false)

  const isAuthenticated = !!cloudConfig.userEmail

  const handleGoogleLogin = async () => {
    setLoading(true)
    clearError()
    try {
      await loginWithGoogle()
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    await logout()
    setLoading(false)
  }

  const handleSync = () => {
    clearError()
    void syncAll()
  }

  if (!FEATURES.CLOUD_SYNC) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2.5 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed opacity-60"
        >
          <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24">
            <path fill="#888" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#888" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#888" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#888" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 w-fit">
          Coming Soon
        </span>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-xs text-slate-500">Checking auth...</span>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded bg-[var(--color-bg-secondary)] px-3 py-2">
          <div className="flex items-center gap-2.5">
            {cloudConfig.userAvatar && (
              <img
                src={cloudConfig.userAvatar}
                alt=""
                className="h-7 w-7 rounded-full"
              />
            )}
            <div className="flex flex-col">
              <span className="text-sm text-slate-200">
                {cloudConfig.userName || cloudConfig.userEmail}
              </span>
              {cloudConfig.userName && (
                <span className="text-xs text-slate-500">{cloudConfig.userEmail}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={status === 'syncing'}
            className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {status === 'syncing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Sync Now
          </button>
          {status === 'syncing' && (
            <span className="text-xs text-slate-500">Syncing...</span>
          )}
        </div>

        {lastSyncAt && (
          <p className="text-xs text-slate-500">
            Last synced: {new Date(lastSyncAt).toLocaleString()}
          </p>
        )}

        {error && (
          <p className="text-xs text-red-400 rounded bg-red-500/10 px-3 py-2" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex items-center justify-center gap-2.5 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-slate-200 hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Sign in with Google
      </button>

      {error && (
        <p className="text-xs text-red-400 rounded bg-red-500/10 px-3 py-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
