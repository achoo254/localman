/**
 * Binary body — file picker (Tauri dialog).
 */

import { open } from '@tauri-apps/plugin-dialog';

interface BodyBinaryPickerProps {
  filePath: string | null;
  onSelect: (path: string | null) => void;
}

export function BodyBinaryPicker({ filePath, onSelect }: BodyBinaryPickerProps) {
  async function handleSelect() {
    try {
      const selected = await open({ multiple: false });
      onSelect(selected ?? null);
    } catch {
      onSelect(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <button
        type="button"
        onClick={handleSelect}
        className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
      >
        Select file
      </button>
      {filePath && (
        <p className="font-mono text-sm text-gray-400 truncate" title={filePath}>
          {filePath}
        </p>
      )}
    </div>
  );
}
