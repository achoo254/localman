/**
 * Copy body and save to file actions.
 */

import { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Copy, Download } from 'lucide-react';

interface ResponseActionsProps {
  body: string;
  onCopy?: () => void;
}

export function ResponseActions({ body, onCopy }: ResponseActionsProps) {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(body).then(() => onCopy?.());
  }, [body, onCopy]);

  const handleSave = useCallback(async () => {
    const path = await save({ defaultPath: 'response.json' });
    if (!path) return;
    try {
      await writeTextFile(path, body);
    } catch {
      // Save failed — user can retry or pick another path
    }
  }, [body]);

  return (
    <div className="flex gap-1 border-b border-[var(--color-bg-tertiary)] px-2 py-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-400 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)]"
      >
        <Copy className="h-4 w-4" />
        Copy
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-400 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)]"
      >
        <Download className="h-4 w-4" />
        Save to file
      </button>
    </div>
  );
}
