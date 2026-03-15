/**
 * Method selector + URL input with variable highlight + Send button.
 * Ctrl+Enter sends.
 */

import { useCallback } from 'react';
import { MethodSelector } from './method-selector';
import { VariableHighlightInput } from '../common/variable-highlight-input';
import type { HttpMethod } from '../../types/enums';

interface UrlBarProps {
  method: HttpMethod;
  url: string;
  onMethodChange: (m: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  /** Resolved URL for tooltip preview (vars replaced). */
  getResolvedUrl?: () => string;
  /** Toggle code snippet panel */
  isSnippetOpen?: boolean;
  onToggleSnippet?: () => void;
}

export function UrlBar({
  method,
  url,
  onMethodChange,
  onUrlChange,
  onSend,
  onCancel,
  isLoading,
  disabled,
  getResolvedUrl,
  isSnippetOpen,
  onToggleSnippet,
}: UrlBarProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  return (
    <div className="group flex items-center gap-2 rounded-xl border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-1.5 shadow-sm transition-all duration-200 focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 hover:border-slate-700">
      <div className="shrink-0">
        <MethodSelector value={method} onChange={onMethodChange} disabled={disabled} />
      </div>
      <div className="flex-1 min-w-0 px-2 text-sm">
        <VariableHighlightInput
          value={url}
          onChange={onUrlChange}
          placeholder="https://api.example.com/..."
          onKeyDown={handleKeyDown}
          getResolvedValue={getResolvedUrl}
        />
      </div>
      <div className="shrink-0 flex items-center gap-1 pr-1">
        {onToggleSnippet && (
          <button
            type="button"
            onClick={onToggleSnippet}
            title="Code snippet"
            className={`flex items-center justify-center rounded-lg px-2.5 py-2 text-sm font-mono transition-colors ${isSnippetOpen ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
          >
            &lt;/&gt;
          </button>
        )}
        {isLoading && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center rounded-lg bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/20 active:scale-95"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className="flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
