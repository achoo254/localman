/**
 * CodeMirror 6 JSON body editor.
 */

import { json } from '@codemirror/lang-json';
import { useCodemirrorEditor } from '../../hooks/use-codemirror-editor';

const JSON_EXTENSIONS = [json()];
const JSON_DEFAULT = '{\n  \n}';

interface BodyJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function BodyJsonEditor({ value, onChange }: BodyJsonEditorProps) {
  const containerRef = useCodemirrorEditor(value || JSON_DEFAULT, {
    onChange,
    extensions: JSON_EXTENSIONS,
    resetKey: 'json',
  });

  return <div ref={containerRef} className="min-h-[200px] h-full" />;
}
