/**
 * URL/input with {{variable}} highlighted in accent color.
 * When focused, shows native input for correct cursor/selection.
 * When blurred, shows overlay with colored variable highlights.
 * Optional tooltip showing resolved value when getResolvedValue is provided.
 */

import { useRef, useState, useCallback } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface VariableHighlightInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** When provided, tooltip on hover shows this resolved string (e.g. URL with vars replaced). */
  getResolvedValue?: () => string;
  type?: 'text' | 'password';
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
  type = 'text',
}: VariableHighlightInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const segments = segmentize(value);
  const resolved = getResolvedValue?.() ?? '';
  const hasVars = segments.some(s => s.isVar);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  const handleOverlayClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const inputBlock = (
    <div className={`relative min-w-0 flex-1 rounded bg-[var(--color-bg-secondary)] ${
      focused ? 'ring-1 ring-[var(--color-accent)]' : ''
    }`}>
      {/* Highlighted overlay — only visible when NOT focused */}
      {!focused && hasVars && value && (
        <div
          aria-hidden
          onClick={handleOverlayClick}
          className="absolute inset-0 flex cursor-text items-center overflow-hidden whitespace-pre rounded px-3 font-mono text-sm"
        >
          {segments.map((s, i) =>
            s.isVar ? (
              <span key={i} className="text-[var(--color-accent)]">
                {s.text}
              </span>
            ) : (
              <span key={i} className="text-[var(--foreground)]">{s.text}</span>
            )
          )}
        </div>
      )}
      {/* Real input — text is transparent only when overlay is shown (blurred + has vars) */}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`relative w-full min-w-0 rounded bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-gray-500 ${className}`}
        style={{
          color: (!focused && hasVars && value) ? 'transparent' : 'var(--foreground)',
          caretColor: 'var(--foreground)',
        }}
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

