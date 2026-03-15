/**
 * Collapsible JSON tree with syntax-style colors. No virtualization for MVP.
 */

import { useState, useMemo, memo } from 'react';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function tryParse(value: string): JsonValue | undefined {
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return undefined;
  }
}

const JsonNode = memo(function JsonNode({
  name,
  value,
  depth,
}: {
  name: string;
  value: JsonValue;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArr = Array.isArray(value);

  if (isObj) {
    const entries = Object.entries(value as Record<string, JsonValue>);
    return (
      <div className="font-mono text-sm" style={{ marginLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-left hover:bg-[var(--color-bg-tertiary)]/50 rounded px-1 -mx-1"
        >
          <span className="text-gray-500 select-none w-4">{open ? '▼' : '▶'}</span>
          <span className="text-[var(--color-accent)]">{name ? `"${name}"` : ''}</span>
          <span className="text-gray-400">{'{'}{!open && ' … }'}</span>
        </button>
        {open && (
          <div>
            {entries.map(([k, v]) => (
              <JsonNode key={k} name={k} value={v} depth={depth + 1} />
            ))}
            <div style={{ marginLeft: depth * 12 }} className="text-gray-400">{'}'}</div>
          </div>
        )}
      </div>
    );
  }
  if (isArr) {
    const arr = value as JsonValue[];
    return (
      <div className="font-mono text-sm" style={{ marginLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-left hover:bg-[var(--color-bg-tertiary)]/50 rounded px-1 -mx-1"
        >
          <span className="text-gray-500 select-none w-4">{open ? '▼' : '▶'}</span>
          <span className="text-[var(--color-accent)]">{name ? `"${name}"` : ''}</span>
          <span className="text-gray-400">[</span>
          {!open && <span className="text-gray-500"> … {arr.length} items ]</span>}
        </button>
        {open && (
          <div>
            {arr.map((v, i) => (
              <JsonNode key={i} name={String(i)} value={v} depth={depth + 1} />
            ))}
            <div style={{ marginLeft: depth * 12 }} className="text-gray-400">]</div>
          </div>
        )}
      </div>
    );
  }

  const valStr = value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value);
  const color =
    value === null ? 'text-gray-500' :
    typeof value === 'number' ? 'text-blue-400' :
    typeof value === 'boolean' ? 'text-purple-400' :
    'text-green-400';
  return (
    <div className="font-mono text-sm flex gap-1 flex-wrap" style={{ marginLeft: depth * 12 }}>
      {name !== '' && <span className="text-[var(--color-accent)]">"{name}": </span>}
      <span className={color}>{valStr}</span>
    </div>
  );
});

interface JsonViewerProps {
  body: string;
}

export const JsonViewer = memo(function JsonViewer({ body }: JsonViewerProps) {
  const parsed = useMemo(() => tryParse(body), [body]);
  if (parsed === undefined) {
    return <pre className="p-4 font-mono text-sm text-red-400 whitespace-pre-wrap break-words">Invalid JSON</pre>;
  }
  return (
    <div className="p-4 overflow-auto min-h-0">
      <JsonNode name="" value={parsed} depth={0} />
    </div>
  );
});
