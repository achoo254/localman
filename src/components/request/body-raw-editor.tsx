/**
 * CodeMirror 6 raw/XML body editor.
 */

import { useMemo } from 'react';
import { xml } from '@codemirror/lang-xml';
import { useCodemirrorEditor } from '../../hooks/use-codemirror-editor';

interface BodyRawEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'xml' | 'plain';
}

export function BodyRawEditor({ value, onChange, language = 'plain' }: BodyRawEditorProps) {
  // Rebuild extensions only when language changes; resetKey drives editor remount
  const extensions = useMemo(() => (language === 'xml' ? [xml()] : []), [language]);

  const containerRef = useCodemirrorEditor(value ?? '', {
    onChange,
    extensions,
    resetKey: language,
  });

  return <div ref={containerRef} className="min-h-[200px] h-full" />;
}
