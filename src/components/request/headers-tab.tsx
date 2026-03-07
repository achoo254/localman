/**
 * Headers editor with auto-suggest for common headers.
 */

import { KeyValueEditor } from '../common/key-value-editor';
import type { KeyValuePair } from '../../types/common';

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
  return (
    <div className="p-4">
      <div className="mb-2 text-xs text-gray-400">
        Suggest: {SUGGESTED_HEADERS.join(', ')}
      </div>
      <KeyValueEditor
        pairs={headers}
        onChange={onChange}
        placeholderKey="Header name"
        placeholderValue="Value"
      />
    </div>
  );
}
