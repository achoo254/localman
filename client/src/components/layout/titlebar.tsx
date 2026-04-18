import { Braces, FileUp, Settings } from 'lucide-react';

interface TitlebarProps {
  onImportClick?: () => void;
  onSettingsClick?: () => void;
  onOpenSyncSettings?: () => void;
  onToggleVariablesPanel?: () => void;
  variablesPanelOpen?: boolean;
}

export function Titlebar({
  onImportClick,
  onSettingsClick,
  onToggleVariablesPanel,
  variablesPanelOpen,
}: TitlebarProps) {
  return (
    <header
      className="flex h-11 shrink-0 items-center justify-between px-4 border-b border-slate-800/50 bg-[var(--color-bg-primary)] select-none"
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
      {onToggleVariablesPanel && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={onToggleVariablesPanel}
            className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors ${
              variablesPanelOpen
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
            title="Variables in request (Ctrl+Alt+V)"
            aria-label="Toggle variables panel"
            aria-pressed={variablesPanelOpen}
          >
            <Braces className="h-3.5 w-3.5" />
            Variables
          </button>
        </div>
      )}
    </header>
  );
}
