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
    } catch (err) {
      void err; // save failed silently
    }
  }, [body]);

  return (
    <div className="flex gap-2 border-b border-[var(--color-bg-tertiary)] px-3 py-2 bg-[#0B1120]">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
      >
        <Copy className="h-4 w-4" />
        Copy
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
      >
        <Download className="h-4 w-4" />
        Save to file
      </button>
    </div>
  );
}
