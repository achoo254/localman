/**
 * Cloud Sync settings: server URL, cloud login, legacy endpoint fallback.
 */

import { useState, useEffect } from 'react';
import { Cloud, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useSyncStore } from '../../stores/sync-store';
import { CloudLoginForm } from './cloud-login-form';
import type { SyncConfig, SyncKeyValue } from '../../types/sync';
import type { CloudSyncConfig } from '../../types/cloud-sync';

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
  const {
    config,
    cloudConfig,
    status,
    loadConfig,
    setConfig,
    setCloudConfig,
    setMode,
    syncAll,
    testConnection,
    clearError,
  } = useSyncStore();

  const [testResult, setTestResult] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const c = config ?? { enabled: false, endpoints: { list: '', download: '', upload: '', delete: '' }, headers: [], params: [], lastSyncAt: null };

  const updateLegacy = (patch: Partial<SyncConfig>) => {
    const next = { ...c, ...patch };
    void setConfig(next);
  };

  const updateCloud = (patch: Partial<CloudSyncConfig>) => {
    const next = { ...cloudConfig, ...patch };
    void setCloudConfig(next);
  };

  const handleTest = async () => {
    setTestResult(null);
    const r = await testConnection();
    setTestResult(r.ok ? 'Connected' : `Failed: ${r.error ?? 'Unknown'}`);
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
        <div className="flex gap-2">
          <input
            type="url"
            value={cloudConfig.serverUrl}
            onChange={e => updateCloud({ serverUrl: e.target.value })}
            placeholder="https://api.localman.app"
            className="flex-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={!cloudConfig.serverUrl}
            className="rounded bg-[var(--color-bg-tertiary)] px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            Test
          </button>
        </div>
        {testResult && (
          <p className={`text-xs ${testResult.startsWith('Connected') ? 'text-green-400' : 'text-red-400'}`}>
            {testResult}
          </p>
        )}
      </label>

      {/* Cloud Auth + Sync */}
      <CloudLoginForm />

      {/* Legacy endpoint mode (collapsible) */}
      <div className="border-t border-[var(--color-bg-tertiary)] pt-3 mt-1">
        <button
          type="button"
          onClick={() => setShowLegacy(!showLegacy)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
        >
          {showLegacy ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Advanced: Custom endpoint sync
        </button>
      </div>

      {showLegacy && (
        <div className="flex flex-col gap-3 pl-2 border-l-2 border-[var(--color-bg-tertiary)]">
          <p className="text-xs text-slate-500">
            Use custom HTTP endpoints instead of Localman server. Requires 4 endpoint URLs.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={c.enabled}
              onChange={e => { updateLegacy({ enabled: e.target.checked }); if (e.target.checked) setMode('legacy'); }}
              className="rounded border-slate-600 text-[var(--color-accent)]"
            />
            <span className="text-sm text-slate-300">Enable legacy sync</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">List (GET)</span>
            <input
              type="url"
              value={c.endpoints.list}
              onChange={e => updateLegacy({ endpoints: { ...c.endpoints, list: e.target.value } })}
              placeholder="https://api.example.com/sync/list"
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Download (GET)</span>
            <input
              type="url"
              value={c.endpoints.download}
              onChange={e => updateLegacy({ endpoints: { ...c.endpoints, download: e.target.value } })}
              placeholder="https://api.example.com/sync/{filename}"
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Upload (PUT)</span>
            <input
              type="url"
              value={c.endpoints.upload}
              onChange={e => updateLegacy({ endpoints: { ...c.endpoints, upload: e.target.value } })}
              placeholder="https://api.example.com/sync/{filename}"
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Delete (DELETE)</span>
            <input
              type="url"
              value={c.endpoints.delete}
              onChange={e => updateLegacy({ endpoints: { ...c.endpoints, delete: e.target.value } })}
              placeholder="https://api.example.com/sync/{filename}"
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <div>
            <p className="text-xs text-slate-400 mb-1">Headers</p>
            <SyncKeyValueTable
              pairs={c.headers}
              onChange={headers => updateLegacy({ headers })}
              placeholderKey="Header name"
              placeholderValue="Value"
            />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Query params</p>
            <SyncKeyValueTable
              pairs={c.params}
              onChange={params => updateLegacy({ params })}
              placeholderKey="Param"
              placeholderValue="Value"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { clearError(); setMode('legacy'); void syncAll(); }}
              disabled={!c.enabled || status === 'syncing'}
              className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === 'syncing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
              Sync (legacy)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
