/**
 * Editor settings: font size, tab size, word wrap, line numbers.
 */

import { useSettingsStore } from '../../stores/settings-store';

export function EditorSettings() {
  const { editor, setEditor } = useSettingsStore();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Editor</h2>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Font size (px)</span>
        <input
          type="number"
          min={12}
          max={24}
          value={editor.fontSize}
          onChange={e => setEditor({ fontSize: Number(e.target.value) || 14 })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 w-24"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Tab size</span>
        <select
          value={editor.tabSize}
          onChange={e => setEditor({ tabSize: Number(e.target.value) })}
          className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-slate-200 w-24"
        >
          <option value={2}>2</option>
          <option value={4}>4</option>
        </select>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={editor.wordWrap}
          onChange={e => setEditor({ wordWrap: e.target.checked })}
          className="w-4 h-4 rounded border-slate-600 text-[var(--color-accent)] cursor-pointer"
        />
        <span className="text-sm text-slate-300">Word wrap</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={editor.lineNumbers}
          onChange={e => setEditor({ lineNumbers: e.target.checked })}
          className="w-4 h-4 rounded border-slate-600 text-[var(--color-accent)] cursor-pointer"
        />
        <span className="text-sm text-slate-300">Line numbers</span>
      </label>
    </div>
  );
}
