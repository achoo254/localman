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
    // placeholder identity is stable per render; resetKey handles re-mount if it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholder]
  );

  const containerRef = useCodemirrorEditor(value ?? '', {
    onChange,
    extensions,
    resetKey: 'script',
  });

  return <div ref={containerRef} className="min-h-[140px] w-full rounded border border-[var(--color-bg-tertiary)] overflow-hidden" />;
}
