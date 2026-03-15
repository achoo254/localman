/**
 * Headers editor with auto-suggest for common headers.
 */

import { KeyValueEditor } from '../common/key-value-editor';
import type { KeyValuePair } from '../../types/common';
import { useEnvironmentStore } from '../../stores/environment-store';
import { interpolateString } from '../../services/interpolation-engine';

const SUGGESTED_HEADERS = [
  'Accept',
  'Accept-Language',
  'Authorization',
  'Content-Type',
  'Cache-Control',
  'User-Agent',
  'X-Requested-With',
  'Origin',
];

interface HeadersTabProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
}

export function HeadersTab({ headers, onChange }: HeadersTabProps) {
  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);
  return (
    <div className="p-4">
      <div className="mb-3 text-[13px] font-medium text-slate-500 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Suggest:</span>
        <div className="flex gap-1 flex-wrap">
          {SUGGESTED_HEADERS.map(h => (
            <button
              key={h}
              onClick={() => {
                onChange([...headers, { id: crypto.randomUUID(), key: h, value: '', enabled: true }]);
              }}
              className="rounded bg-slate-800/50 px-1.5 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <KeyValueEditor
        pairs={headers}
        onChange={onChange}
        placeholderKey="Header name"
        placeholderValue="Value ({{var}})"
        getResolvedValue={v => interpolateString(v, getInterpolationContext())}
      />
    </div>
  );
}
