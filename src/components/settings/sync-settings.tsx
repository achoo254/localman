/**
 * Cloud Sync settings: endpoints, headers, params, test connection, sync now.
 */

import { useState, useEffect } from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';
import type { SyncConfig, SyncKeyValue } from '../../types/sync';

function SyncKeyValueTable({
  pairs,
  onChange,
  placeholderKey,
  placeholderValue,
}: {
  pairs: SyncKeyValue[];
  onChange: (p: SyncKeyValue[]) => void;
  placeholderKey: string;
  placeholderValue: string;
}) {
  const updateRow = (idx: number, patch: Partial<SyncKeyValue>) => {
    const next = pairs.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  };
  const add = () => onChange([...pairs, { key: '', value: '' }]);
  const remove = (idx: number) => onChange(pairs.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-1">
      {pairs.map((p, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            value={p.key}
            onChange={e => updateRow(idx, { key: e.target.value })}
            placeholder={placeholderKey}
            className="flex-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm text-slate-200"
          />
          <input
            value={p.value}
            onChange={e => updateRow(idx, { value: e.target.value })}
            placeholder={placeholderValue}
            className="flex-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm text-slate-200"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="rounded p-1.5 text-slate-500 hover:text-red-400"
            aria-label="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="self-start text-xs text-[var(--color-accent)] hover:underline">
        + Add row
      </button>
    </div>
  );
}

export function SyncSettings() {
  const { config, status, lastSyncAt, error, loadConfig, setConfig, syncAll, testConnection, clearError } = useSyncStore();
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const c = config ?? { enabled: false, endpoints: { list: '', download: '', upload: '', delete: '' }, headers: [], params: [], lastSyncAt: null };

  const update = (patch: Partial<SyncConfig>) => {
    const next = { ...c, ...patch };
    void setConfig(next);
  };

  const handleTest = async () => {
    setTestResult(null);
    const r = await testConnection();
    setTestResult(r.ok ? `OK — ${r.count ?? 0} file(s)` : `Failed: ${r.error ?? 'Unknown'}`);
  };

  const handleSync = () => {
    setTestResult(null);
    clearError();
    void syncAll();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Cloud Sync</h2>
      <p className="text-xs text-slate-500">
        Sync collections as Postman v2.1 JSON to your own HTTP endpoints. Use <code className="bg-black/20 px-1 rounded">{'{filename}'}</code> in URLs.
      </p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={c.enabled}
          onChange={e => update({ enabled: e.target.checked })}
          className="rounded border-slate-600 text-[var(--color-accent)]"
        />
        <span className="text-sm text-slate-300">Enable Cloud Sync</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">List (GET) — returns array of {"{ filename, updated_at? }"}</span>
        <input
          type="url"
          value={c.endpoints.list}
          onChange={e => update({ endpoints: { ...c.endpoints, list: e.target.value } })}
          placeholder="https://api.example.com/sync/list"
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Download (GET {"{filename}"})</span>
        <input
          type="url"
          value={c.endpoints.download}
          onChange={e => update({ endpoints: { ...c.endpoints, download: e.target.value } })}
          placeholder="https://api.example.com/sync/{filename}"
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Upload (PUT {"{filename}"})</span>
        <input
          type="url"
          value={c.endpoints.upload}
          onChange={e => update({ endpoints: { ...c.endpoints, upload: e.target.value } })}
          placeholder="https://api.example.com/sync/{filename}"
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Delete (DELETE {"{filename}"})</span>
        <input
          type="url"
          value={c.endpoints.delete}
          onChange={e => update({ endpoints: { ...c.endpoints, delete: e.target.value } })}
          placeholder="https://api.example.com/sync/{filename}"
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <div>
        <p className="text-xs text-slate-400 mb-1">Headers (e.g. Authorization)</p>
        <SyncKeyValueTable
          pairs={c.headers}
          onChange={headers => update({ headers })}
          placeholderKey="Header name"
          placeholderValue="Value"
        />
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-1">Query params</p>
        <SyncKeyValueTable
          pairs={c.params}
          onChange={params => update({ params })}
          placeholderKey="Param"
          placeholderValue="Value"
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 rounded bg-red-500/10 px-3 py-2" role="alert">
          {error}
        </p>
      )}
      {testResult && (
        <p className="text-xs text-slate-400">{testResult}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={!c.endpoints.list}
          className="rounded bg-[var(--color-bg-tertiary)] px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          Test connection
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={!c.enabled || status === 'syncing'}
          className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {status === 'syncing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
          Sync now
        </button>
      </div>
      {lastSyncAt && (
        <p className="text-xs text-slate-500">Last synced: {new Date(lastSyncAt).toLocaleString()}</p>
      )}
    </div>
  );
}
