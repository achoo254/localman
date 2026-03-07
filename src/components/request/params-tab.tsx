/**
 * Query params editor — key-value table.
 * URL sync is handled by parent (request panel).
 */

import { KeyValueEditor } from '../common/key-value-editor';
import type { KeyValuePair } from '../../types/common';

interface ParamsTabProps {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
}

export function ParamsTab({ params, onChange }: ParamsTabProps) {
  return (
    <div className="p-4">
      <KeyValueEditor
        pairs={params}
        onChange={onChange}
        placeholderKey="Query key"
        placeholderValue="Value"
      />
    </div>
  );
}
