/**
 * Form data / x-www-form-urlencoded key-value editor.
 */

import { KeyValueEditor } from '../common/key-value-editor';
import type { KeyValuePair } from '../../types/common';
import { useEnvironmentStore } from '../../stores/environment-store';
import { interpolateString } from '../../services/interpolation-engine';

interface BodyFormEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}

export function BodyFormEditor({ pairs, onChange }: BodyFormEditorProps) {
  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);
  return (
    <div className="p-2">
      <KeyValueEditor
        pairs={pairs}
        onChange={onChange}
        placeholderKey="Key"
        placeholderValue="Value ({{var}})"
        getResolvedValue={v => interpolateString(v, getInterpolationContext())}
      />
    </div>
  );
}
