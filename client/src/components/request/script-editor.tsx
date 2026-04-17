/**
 * CodeMirror 6 editor for pre/post request scripts (JavaScript).
 */

import { useMemo } from 'react';
import { javascript } from '@codemirror/lang-javascript';
import { placeholder as cmPlaceholder } from '@codemirror/view';
import { useCodemirrorEditor } from '../../hooks/use-codemirror-editor';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ScriptEditor({ value, onChange, placeholder }: ScriptEditorProps) {
  const extensions = useMemo(
    () => [javascript(), ...(placeholder ? [cmPlaceholder(placeholder)] : [])],
    [placeholder]
  );

  const containerRef = useCodemirrorEditor(value ?? '', {
    onChange,
    extensions,
    resetKey: 'script',
  });

  return <div ref={containerRef} className="min-h-[140px] w-full rounded border border-[var(--color-bg-tertiary)] overflow-hidden" />;
}
