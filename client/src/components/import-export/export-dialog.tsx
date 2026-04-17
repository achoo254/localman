/**
 * Export dialog: format selector and save for a collection.
 */

import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  exportCollectionAsNative,
  exportCollectionAsPostman,
  saveExportFile,
} from '../../services/import-export-service';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string | null;
  collectionName: string;
}

type ExportFormat = 'native' | 'postman';

export function ExportDialog({
  open,
  onOpenChange,
  collectionId,
  collectionName,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('postman');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!collectionId) return;
    setError(null);
    setLoading(true);
    try {
      const content =
        format === 'native'
          ? await exportCollectionAsNative(collectionId)
          : await exportCollectionAsPostman(collectionId);
      const ext = format === 'native' ? 'localman.json' : 'postman.json';
      const defaultName = `${collectionName.replace(/[^a-z0-9-_]/gi, '_')}.${ext}`;
      const ok = await saveExportFile(defaultName, content);
      if (ok) onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }, [collectionId, collectionName, format, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setError(null);
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold">Export collection</Dialog.Title>
          <p className="mt-1 text-xs text-gray-400">{collectionName}</p>
          <div className="mt-4 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportFormat"
                checked={format === 'postman'}
                onChange={() => setFormat('postman')}
                className="rounded-full border-slate-600 text-[var(--color-accent)]"
              />
              <span className="text-sm">Postman Collection v2.1</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportFormat"
                checked={format === 'native'}
                onChange={() => setFormat('native')}
                className="rounded-full border-slate-600 text-[var(--color-accent)]"
              />
              <span className="text-sm">Localman JSON</span>
            </label>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-slate-200">
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="rounded bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Exporting…' : 'Save as file…'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
