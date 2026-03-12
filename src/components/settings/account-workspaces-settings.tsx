/**
 * Account & Workspaces settings panel.
 * Sections: Account (server URL, login/logout), Workspaces (list, create, join).
 */

import { useEffect, useState } from 'react';
import { Loader2, LogOut, Plus, Cloud } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { WorkspaceList } from './workspace-list';
import { NameInputDialog } from '../common/name-input-dialog';
import type { CloudSyncConfig } from '../../types/cloud-sync';

type AuthTab = 'login' | 'register';

function AccountSection() {
  const { config, status, lastSyncAt, error, loadConfig, saveConfig, login, register, logout, syncAll, clearError, isAuthenticated } = useSyncStore();
  const [tab, setTab] = useState<AuthTab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  const updateServerUrl = (serverUrl: string) => {
    void saveConfig({ ...config, serverUrl } as CloudSyncConfig);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    clearError();
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setEmail(''); setPassword(''); setName('');
    setBusy(false);
  };

  const authenticated = isAuthenticated();

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</h3>

      {/* Server URL — always visible */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Server URL</span>
        <input
          type="url"
          value={config.serverUrl}
          onChange={e => updateServerUrl(e.target.value)}
          placeholder="https://api.localman.app"
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[var(--color-accent)] focus:outline-none"
        />
      </label>

      {authenticated ? (
        /* Profile + actions when logged in */
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2.5">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-200 truncate">
                {config.userName || config.userEmail}
              </span>
              {config.userName && (
                <span className="text-xs text-slate-500 truncate">{config.userEmail}</span>
              )}
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
              disabled={!config.token || status === 'syncing'}
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
        /* Login / Register form */
        <div className="flex flex-col gap-3">
          <div className="flex rounded bg-[var(--color-bg-secondary)] p-0.5">
            {(['login', 'register'] as AuthTab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); clearError(); }}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? 'bg-[var(--color-bg-tertiary)] text-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-2">
            {tab === 'register' && (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Name"
                required
                className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[var(--color-accent)] focus:outline-none"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={8}
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[var(--color-accent)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !config.serverUrl}
              className="flex items-center justify-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tab === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {error && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>
          )}
          {!config.serverUrl && (
            <p className="text-xs text-yellow-500">Enter a server URL above first.</p>
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

  if (!isAuthenticated) {
    return (
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspaces</h3>
        <p className="text-xs text-slate-500">Login to access team workspaces.</p>
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
