/**
 * Data settings: export backup, import backup, clear all data.
 */

import { useState, useEffect, useRef } from 'react';
import {
  exportFullBackupJson,
  saveExportFile,
  openImportFile,
  importFromFileContent,
  clearAllData,
} from '../../services/import-export-service';

export function DataSettings() {
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(messageTimeoutRef.current), []);

  async function handleExportBackup() {
    const json = await exportFullBackupJson();
    const ok = await saveExportFile('localman-backup.json', json);
    setImportMessage(ok ? 'Backup saved.' : null);
    if (ok) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = setTimeout(() => setImportMessage(null), 3000);
    }
  }

  async function handleImportBackup() {
    setImportMessage(null);
    const file = await openImportFile();
    if (!file) return;
    try {
      const preview = await importFromFileContent(file.content);
      if (preview) {
        const parts: string[] = [preview.format];
        if (preview.collectionName) parts.push(preview.collectionName);
        if (preview.requestCount != null) parts.push(`${preview.requestCount} request(s)`);
        setImportMessage(parts.join(' — ') + '. Import complete.');
      } else {
        setImportMessage('Unsupported file format.');
      }
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : 'Import failed.');
    }
    clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setImportMessage(null), 5000);
  }

  async function handleClearAll() {
    if (!confirmClear) return;
    setClearing(true);
    try {
      await clearAllData();
      setConfirmClear(false);
      window.location.reload();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Data</h2>
      {importMessage && (
        <p className="text-xs text-slate-400 rounded bg-[var(--color-bg-tertiary)] px-3 py-2" role="status">
          {importMessage}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleExportBackup}
          className="rounded bg-[var(--color-bg-tertiary)] px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 w-fit"
        >
          Export full backup
        </button>
        <button
          type="button"
          onClick={handleImportBackup}
          className="rounded bg-[var(--color-bg-tertiary)] px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 w-fit"
        >
          Import from backup
        </button>
      </div>
      <div className="border-t border-[var(--color-bg-tertiary)] pt-4">
        <p className="text-xs text-slate-500 mb-2">Clear all collections, requests, environments, and history. Settings are kept.</p>
        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 w-fit"
          >
            Clear all data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50 w-fit"
            >
              {clearing ? 'Clearing…' : 'Confirm clear'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 w-fit"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
