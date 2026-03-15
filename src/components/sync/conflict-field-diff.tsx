/**
 * Per-field conflict diff — shows server vs client value side-by-side
 * with pick buttons. For JSON fields: formatted display. For simple: plain text.
 */

import type { FieldResolution } from "../../stores/conflict-store";

interface ConflictFieldDiffProps {
  field: string;
  serverValue: unknown;
  clientValue: unknown;
  resolution: FieldResolution | null;
  onResolve: (choice: FieldResolution) => void;
}

export function ConflictFieldDiff({
  field,
  serverValue,
  clientValue,
  resolution,
  onResolve,
}: ConflictFieldDiffProps) {
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "(empty)";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        {field}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Server version */}
        <button
          type="button"
          onClick={() => onResolve("server")}
          className={`rounded border p-2 text-left text-xs transition-colors ${
            resolution === "server"
              ? "border-green-500/50 bg-green-500/10"
              : "border-[var(--color-bg-tertiary)] hover:border-gray-500"
          }`}
        >
          <div className="mb-1 text-[10px] font-medium text-gray-500">
            Server {resolution === "server" && "✓"}
          </div>
          <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
            {formatValue(serverValue)}
          </pre>
        </button>

        {/* Client version */}
        <button
          type="button"
          onClick={() => onResolve("client")}
          className={`rounded border p-2 text-left text-xs transition-colors ${
            resolution === "client"
              ? "border-blue-500/50 bg-blue-500/10"
              : "border-[var(--color-bg-tertiary)] hover:border-gray-500"
          }`}
        >
          <div className="mb-1 text-[10px] font-medium text-gray-500">
            Yours {resolution === "client" && "✓"}
          </div>
          <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
            {formatValue(clientValue)}
          </pre>
        </button>
      </div>
    </div>
  );
}
