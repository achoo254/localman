/**
 * URL/input with {{variable}} highlighted in accent color.
 * Optional tooltip showing resolved value when getResolvedValue is provided.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface VariableHighlightInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** When provided, tooltip on hover shows this resolved string (e.g. URL with vars replaced). */
  getResolvedValue?: () => string;
}

const VAR_PATTERN = /\{\{[^}]+\}\}/g;

function segmentize(str: string): { text: string; isVar: boolean }[] {
  const segments: { text: string; isVar: boolean }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_PATTERN.source, 'g');
  while ((m = re.exec(str)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: str.slice(lastIndex, m.index), isVar: false });
    }
    segments.push({ text: m[0], isVar: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < str.length) {
    segments.push({ text: str.slice(lastIndex), isVar: false });
  }
  return segments.length ? segments : [{ text: '', isVar: false }];
}

export function VariableHighlightInput({
  value,
  onChange,
  placeholder = '',
  className = '',
  onKeyDown,
  getResolvedValue,
}: VariableHighlightInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const segments = segmentize(value);
  const resolved = getResolvedValue?.() ?? '';

  const handleScroll = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      const wrap = el.parentElement?.querySelector('[data-overlay]');
      if (wrap) wrap.scrollLeft = el.scrollLeft;
    }
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const wrap = el.parentElement;
    if (!wrap) return;
    const overlay = wrap.querySelector('[data-overlay]');
    if (overlay) (overlay as HTMLElement).scrollLeft = el.scrollLeft;
  }, [value]);

  const inputBlock = (
    <div className="relative flex min-w-0 flex-1">
      <div
        data-overlay
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center overflow-hidden rounded bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm"
      >
        {value ? (
          <span className="whitespace-pre text-[var(--foreground)]">
            {segments.map((s, i) =>
              s.isVar ? (
                <span key={i} className="text-[var(--color-accent)]">
                  {s.text}
                </span>
              ) : (
                <span key={i}>{s.text}</span>
              )
            )}
          </span>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full min-w-0 rounded bg-transparent px-3 py-2 font-mono text-sm text-transparent outline-none caret-[var(--foreground)] placeholder:text-gray-500 ${
          focused ? 'ring-1 ring-[var(--color-accent)]' : ''
        } ${className}`}
        spellCheck={false}
      />
    </div>
  );

  if (getResolvedValue) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="min-w-0 flex-1">{inputBlock}</div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              className="max-w-md break-all rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-2 py-1.5 font-mono text-xs shadow-lg"
            >
              {resolved || '(empty)'}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return inputBlock;
}
