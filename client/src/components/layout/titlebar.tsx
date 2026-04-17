import { FileUp, Settings } from 'lucide-react';

interface TitlebarProps {
  onImportClick?: () => void;
  onSettingsClick?: () => void;
  onOpenSyncSettings?: () => void;
}

export function Titlebar({ onImportClick, onSettingsClick }: TitlebarProps) {
  return (
    <header
      className="flex h-11 shrink-0 items-center justify-between px-4 border-b border-slate-800/50 bg-[#0B1120] select-none"
    >
      <div className="flex flex-1 items-center gap-2">
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
      </div>
    </header>
  );
}
