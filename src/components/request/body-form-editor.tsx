/**
 * Form data / x-www-form-urlencoded key-value editor.
 */

import { KeyValueEditor } from '../common/key-value-editor';
import type { KeyValuePair } from '../../types/common';

interface BodyFormEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}

export function BodyFormEditor({ pairs, onChange }: BodyFormEditorProps) {
  return (
    <div className="p-2">
      <KeyValueEditor
        pairs={pairs}
        onChange={onChange}
        placeholderKey="Key"
        placeholderValue="Value"
      />
    </div>
  );
}
