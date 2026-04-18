/**
 * Hover/focus popover over a variable value input — textarea 4-row edit with
 * source badge. Used in env variable table (Case A).
 *
 * [RED TEAM C2] Secret value never rendered into textarea until explicit reveal —
 *   popover receives raw value via prop only when caller passes revealed value.
 * [RED TEAM M15] Blur commit guards IME composition (isComposing).
 */

import { useCallback, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Eye, EyeOff } from 'lucide-react';

const MASK = '••••••••';

interface VariableValuePopoverProps {
  value: string;
  onChange: (next: string) => void;
  secret?: boolean;
  /** Context label shown at bottom (env name or "Global"). */
  sourceLabel?: string;
  /** Existing input element used as popover anchor. */
  children: React.ReactNode;
  /** Disable popover entirely (e.g., row disabled). */
  disabled?: boolean;
}

export function VariableValuePopover({
  value,
  onChange,
  secret = false,
  sourceLabel,
  children,
  disabled = false,
}: VariableValuePopoverProps) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(value);
  const isComposing = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, [cancelClose]);

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    if (next) setDraft(value);
  };

  const commit = useCallback(() => {
    if (isComposing.current) return; // [RED TEAM M15] skip mid-IME
    if (draft !== value) onChange(draft);
  }, [draft, value, onChange]);

  const canShowValue = !secret || revealed;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Anchor asChild>
        <div
          className="min-w-0 flex-1"
          onMouseEnter={() => {
            if (disabled) return;
            cancelClose();
            setOpen(true);
            setDraft(value);
          }}
          onMouseLeave={scheduleClose}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setDraft(value);
          }}
        >
          {children}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onOpenAutoFocus={e => e.preventDefault()}
          className="z-50 flex w-[360px] max-w-[360px] flex-col gap-2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-2 shadow-lg"
        >
          <textarea
            rows={4}
            value={canShowValue ? draft : MASK}
            onChange={e => {
              if (!canShowValue) return;
              setDraft(e.target.value);
            }}
            onCompositionStart={() => {
              isComposing.current = true;
            }}
            onCompositionEnd={() => {
              isComposing.current = false;
            }}
            onBlur={commit}
            readOnly={!canShowValue}
            autoComplete="off"
            data-lpignore="true"
            spellCheck={false}
            className="w-full resize-y rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
          />
          <div className="flex items-center justify-between text-[length:var(--text-xs)] text-slate-400">
            <div className="flex items-center gap-1.5">
              <SourceDot kind={sourceLabel === 'Global' ? 'global' : 'environment'} />
              <span className="font-medium text-slate-300">
                {sourceLabel ?? 'Environment'}
              </span>
            </div>
            {secret && (
              <button
                type="button"
                onClick={() => setRevealed(r => !r)}
                className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
                aria-label={revealed ? 'Hide value' : 'Reveal value'}
                title={revealed ? 'Hide' : 'Reveal'}
              >
                {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SourceDot({ kind }: { kind: 'environment' | 'global' }) {
  const color = kind === 'environment' ? 'bg-blue-500' : 'bg-yellow-500';
  const letter = kind === 'environment' ? 'E' : 'G';
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-[var(--color-text-on-accent)] ${color}`}
    >
      {letter}
    </span>
  );
}
