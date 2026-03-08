/**
 * Query params editor — key-value table.
 * URL sync is handled by parent (request panel).
 */

import { KeyValueEditor } from '../common/key-value-editor';
import type { KeyValuePair } from '../../types/common';
import { useEnvironmentStore } from '../../stores/environment-store';
import { interpolateString } from '../../services/interpolation-engine';

interface ParamsTabProps {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
}

export function ParamsTab({ params, onChange }: ParamsTabProps) {
  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);
  return (
    <div className="p-4">
      <KeyValueEditor
        pairs={params}
        onChange={onChange}
        placeholderKey="Query key"
        placeholderValue="Value ({{var}})"
        getResolvedValue={v => interpolateString(v, getInterpolationContext())}
      />
    </div>
  );
}
