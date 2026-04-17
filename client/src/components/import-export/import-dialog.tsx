/**
 * Import dialog: File (picker + drag-drop) and cURL (paste) tabs.
 */

import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FileUp, Terminal } from 'lucide-react';
import {
  openImportFile,
  importFromFileContent,
  importFromCurl,
  type ImportPreview,
} from '../../services/import-export-service';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (preview: ImportPreview) => void;
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'curl'>('file');
  const [curlText, setCurlText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await openImportFile();
      if (!result) return;
      const preview = await importFromFileContent(result.content);
      if (!preview) {
        setError('Unsupported format. Use Postman v2.1 or Localman JSON.');
        return;
      }
      onSuccess?.(preview);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }, [onOpenChange, onSuccess]);

  const handleCurlImport = useCallback(async () => {
    const trimmed = curlText.trim();
    if (!trimmed) {
      setError('Paste a cURL command first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const preview = await importFromCurl(trimmed);
      onSuccess?.(preview);
      setCurlText('');
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid cURL');
    } finally {
      setLoading(false);
    }
  }, [curlText, onOpenChange, onSuccess]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setError(null);
        setCurlText('');
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold">Import</Dialog.Title>
          <div className="mt-3 flex gap-1 border-b border-[var(--color-bg-tertiary)]">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t ${activeTab === 'file' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]' : 'text-gray-400 hover:text-slate-200'}`}
            >
              <FileUp className="h-4 w-4" />
              File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('curl')}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t ${activeTab === 'curl' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]' : 'text-gray-400 hover:text-slate-200'}`}
            >
              <Terminal className="h-4 w-4" />
              cURL
            </button>
          </div>
          <div className="mt-3 min-h-[120px]">
            {activeTab === 'file' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-400">Postman Collection v2.1 or Localman backup JSON</p>
                <button
                  type="button"
                  onClick={handleFileSelect}
                  disabled={loading}
                  className="rounded-lg border border-dashed border-slate-600 py-8 px-4 text-sm text-gray-400 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
                >
                  {loading ? 'Importing…' : 'Choose file…'}
                </button>
              </div>
            )}
            {activeTab === 'curl' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-400">Paste a cURL command (e.g. from browser DevTools)</p>
                <textarea
                  value={curlText}
                  onChange={e => setCurlText(e.target.value)}
                  placeholder="curl -X GET 'https://api.example.com/...'"
                  className="min-h-[100px] w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={handleCurlImport}
                  disabled={loading || !curlText.trim()}
                  className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? 'Importing…' : 'Import'}
                </button>
              </div>
            )}
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Dialog.Close asChild>
              <button type="button" className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-slate-200">
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
