/**
 * General settings: method, content type, timeout, SSL, redirects.
 */

import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { useHistoryStore } from '../../stores/history-store';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const RETENTION_OPTIONS = [
  { value: 0, label: 'Forever' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export function GeneralSettings() {
  const { general, setGeneral } = useSettingsStore();
  const clearHistory = useHistoryStore(s => s.clearHistory);
  const [confirmClear, setConfirmClear] = useState(false);

  const uiFontSizeOptions = [
    { value: 'small' as const, label: 'Small (12px)' },
    { value: 'medium' as const, label: 'Medium (14px)' },
    { value: 'large' as const, label: 'Large (16px)' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">General</h2>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">UI font size</span>
        <select
          value={general.uiFontSize}
          onChange={e => setGeneral({ uiFontSize: e.target.value as 'small' | 'medium' | 'large' })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        >
          {uiFontSizeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Default HTTP method</span>
        <select
          value={general.defaultMethod}
          onChange={e => setGeneral({ defaultMethod: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        >
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Default Content-Type</span>
        <input
          type="text"
          value={general.defaultContentType}
          onChange={e => setGeneral({ defaultContentType: e.target.value })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Request timeout (ms)</span>
        <input
          type="number"
          min={1000}
          max={300000}
          value={general.requestTimeoutMs}
          onChange={e => setGeneral({ requestTimeoutMs: Number(e.target.value) || 30000 })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 w-32"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={general.sslVerify}
          onChange={e => setGeneral({ sslVerify: e.target.checked })}
          className="rounded border-slate-600 text-[var(--color-accent)]"
        />
        <span className="text-sm text-slate-300">Verify SSL certificates</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={general.followRedirects}
          onChange={e => setGeneral({ followRedirects: e.target.checked })}
          className="rounded border-slate-600 text-[var(--color-accent)]"
        />
        <span className="text-sm text-slate-300">Follow redirects</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Max redirects</span>
        <input
          type="number"
          min={1}
          max={20}
          value={general.maxRedirects}
          onChange={e => setGeneral({ maxRedirects: Number(e.target.value) || 5 })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 w-24"
        />
      </label>

      <div className="h-px bg-[var(--color-bg-tertiary)] my-1" />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</h3>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Keep history for</span>
        <select
          value={general.historyRetentionDays}
          onChange={e => setGeneral({ historyRetentionDays: Number(e.target.value) })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 w-40"
        >
          {RETENTION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        {confirmClear ? (
          <>
            <span className="text-xs text-red-400">Clear all history?</span>
            <button
              type="button"
              onClick={() => { void clearHistory(); setConfirmClear(false); }}
              className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30"
            >
              Yes, clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded bg-[var(--color-bg-tertiary)] px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            Clear all history
          </button>
        )}
      </div>
    </div>
  );
}
