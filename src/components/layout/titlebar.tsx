import { getCurrentWindow } from '@tauri-apps/api/window';
import { FileUp, Settings } from 'lucide-react';
import { SyncStatusIndicator } from './sync-status-indicator';

interface TitlebarProps {
  onImportClick?: () => void;
  onSettingsClick?: () => void;
  onOpenSyncSettings?: () => void;
}

export function Titlebar({ onImportClick, onSettingsClick, onOpenSyncSettings }: TitlebarProps) {
  async function minimize() {
    await getCurrentWindow().minimize();
  }
  async function toggleMaximize() {
    await getCurrentWindow().toggleMaximize();
  }
  async function close() {
    await getCurrentWindow().close();
  }

  return (
    <header
      className="flex h-11 shrink-0 items-center justify-between px-4 border-b border-slate-800/50 bg-[#0B1120] select-none"
    >
      <div
        className="flex flex-1 items-center gap-2"
        data-tauri-drag-region
      >
        <span className="text-xs font-semibold tracking-wider text-slate-300">
          LOCALMAN
        </span>
        {onImportClick && (
          <button
            type="button"
            onClick={onImportClick}
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Import"
            aria-label="Import"
          >
            <FileUp className="h-3.5 w-3.5" />
            Import
          </button>
        )}
        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        )}
        <SyncStatusIndicator onOpenSyncSettings={onOpenSyncSettings} />
      </div>
      <div className="flex items-center gap-0.5" data-tauri-drag-region={false}>
        <button
          type="button"
          aria-label="Minimize"
          onClick={minimize}
          className="flex h-9 w-12 items-center justify-center rounded-none text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          {/* minimize icon */}
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={toggleMaximize}
          className="flex h-9 w-12 items-center justify-center rounded-none text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          {/* maximize icon */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="flex h-9 w-12 items-center justify-center rounded-none text-slate-400 transition-colors hover:bg-red-500 hover:text-white"
        >
          {/* close icon */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
        </button>
      </div>
    </header>
  );
}
