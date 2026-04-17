/**
 * Proxy settings: enable, HTTP/HTTPS URLs, no-proxy, auth.
 */

import { useSettingsStore } from '../../stores/settings-store';

export function ProxySettings() {
  const { proxy, setProxy } = useSettingsStore();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Proxy</h2>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={proxy.enabled}
          onChange={e => setProxy({ enabled: e.target.checked })}
          className="rounded border-slate-600 text-[var(--color-accent)]"
        />
        <span className="text-sm text-slate-300">Use proxy</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">HTTP proxy URL</span>
        <input
          type="text"
          placeholder="http://proxy:8080"
          value={proxy.httpUrl}
          onChange={e => setProxy({ httpUrl: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">HTTPS proxy URL</span>
        <input
          type="text"
          placeholder="https://proxy:8080"
          value={proxy.httpsUrl}
          onChange={e => setProxy({ httpsUrl: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">No proxy (comma-separated hosts)</span>
        <input
          type="text"
          placeholder="localhost,127.0.0.1"
          value={proxy.noProxy}
          onChange={e => setProxy({ noProxy: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Proxy username</span>
        <input
          type="text"
          value={proxy.username}
          onChange={e => setProxy({ username: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Proxy password</span>
        <input
          type="password"
          value={proxy.password}
          onChange={e => setProxy({ password: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
    </div>
  );
}
