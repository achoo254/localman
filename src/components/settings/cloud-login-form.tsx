/**
 * Cloud login/register form for Better Auth.
 * Shows login/register tabs when unauthenticated, user info + sync when authenticated.
 */

import { useState } from 'react';
import { Cloud, Loader2, LogOut } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';

type Tab = 'login' | 'register';

export function CloudLoginForm() {
  const {
    cloudConfig,
    status,
    lastSyncAt,
    error,
    login,
    register,
    logout,
    syncAll,
    clearError,
  } = useSyncStore();

  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!cloudConfig.token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setEmail('');
    setPassword('');
    setName('');
    setLoading(false);
  };

  const handleSync = () => {
    clearError();
    void syncAll();
  };

  if (isAuthenticated) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded bg-[var(--color-bg-secondary)] px-3 py-2">
          <div className="flex flex-col">
            <span className="text-sm text-slate-200">
              {cloudConfig.userName || cloudConfig.userEmail}
            </span>
            {cloudConfig.userName && (
              <span className="text-xs text-slate-500">{cloudConfig.userEmail}</span>
            )}
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
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tab toggle */}
      <div className="flex rounded bg-[var(--color-bg-secondary)] p-0.5">
        <button
          type="button"
          onClick={() => { setTab('login'); clearError(); }}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'login'
              ? 'bg-[var(--color-bg-tertiary)] text-slate-200'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); clearError(); }}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'register'
              ? 'bg-[var(--color-bg-tertiary)] text-slate-200'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {tab === 'register' && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={8}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={loading || !cloudConfig.serverUrl}
          className="flex items-center justify-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {tab === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-400 rounded bg-red-500/10 px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {!cloudConfig.serverUrl && (
        <p className="text-xs text-yellow-500">Enter a server URL above first.</p>
      )}
    </div>
  );
}
