/**
 * Account & Workspaces settings panel.
 * Sections: Account (Google login/logout, sync), Workspaces (list, create).
 */

import { useEffect, useState } from 'react';
import { Loader2, LogOut, Plus, Cloud } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { WorkspaceList } from './workspace-list';
import { NameInputDialog } from '../common/name-input-dialog';
import { FEATURES } from '../../utils/feature-flags';

function AccountSection() {
  const {
    config,
    status,
    lastSyncAt,
    error,
    loadConfig,
    authLoading,
    loginWithGoogle,
    logout,
    syncAll,
    clearError,
    isAuthenticated,
  } = useSyncStore();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (FEATURES.CLOUD_SYNC) void loadConfig(); }, [loadConfig]);

  const handleGoogleLogin = async () => {
    setBusy(true);
    clearError();
    try {
      await loginWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
  };

  const authenticated = isAuthenticated();

  if (authLoading) {
    return (
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</h3>
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          <span className="text-xs text-slate-500">Checking auth...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</h3>

      {authenticated ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {config.userAvatar && (
                <img src={config.userAvatar} alt="" className="h-7 w-7 rounded-full shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-slate-200 truncate">
                  {config.userName || config.userEmail}
                </span>
                {config.userName && (
                  <span className="text-xs text-slate-500 truncate">{config.userEmail}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200 disabled:opacity-50 shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { clearError(); void syncAll(); }}
              disabled={status === 'syncing'}
              className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === 'syncing'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Cloud className="h-3.5 w-3.5" />}
              Sync Now
            </button>
            {lastSyncAt && (
              <span className="text-xs text-slate-500">
                Last sync: {new Date(lastSyncAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {error && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={busy}
            className="flex items-center justify-center gap-2.5 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-slate-200 hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
          >
            {busy ? (
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
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>
          )}
        </div>
      )}
    </section>
  );
}

function WorkspacesSection() {
  const [createOpen, setCreateOpen] = useState(false);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const loadWorkspaces = useWorkspaceStore(s => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace);
  const isAuthenticated = useSyncStore(s => s.isAuthenticated());

  useEffect(() => {
    if (isAuthenticated) void loadWorkspaces();
  }, [isAuthenticated, loadWorkspaces]);

  if (!FEATURES.CLOUD_SYNC || !isAuthenticated) {
    return (
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspaces</h3>
        <p className="text-xs text-slate-500">
          {!FEATURES.CLOUD_SYNC ? 'Team workspaces — Coming Soon' : 'Login to access team workspaces.'}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspaces</h3>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        </div>

        <WorkspaceList workspaces={workspaces} onRefresh={loadWorkspaces} />

        <p className="text-xs text-slate-500">
          Toggle sync per collection by right-clicking it in the sidebar.
        </p>
      </section>

      <NameInputDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Workspace"
        placeholder="Workspace name"
        confirmLabel="Create"
        onConfirm={async name => { await createWorkspace(name); }}
      />
    </>
  );
}

export function AccountWorkspacesSettings() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">Account &amp; Workspaces</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Manage your cloud account and team workspaces.
        </p>
      </div>

      <AccountSection />

      <div className="h-px bg-[var(--color-bg-tertiary)]" />

      <WorkspacesSection />
    </div>
  );
}
