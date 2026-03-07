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
  disabled?: boolean;
}

export function UrlBar({
  method,
  url,
  onMethodChange,
  onUrlChange,
  onSend,
  disabled,
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
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-2">
      <MethodSelector value={method} onChange={onMethodChange} disabled={disabled} />
      <VariableHighlightInput
        value={url}
        onChange={onUrlChange}
        placeholder="https://api.example.com/..."
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        className="rounded bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
