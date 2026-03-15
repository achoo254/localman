/**
 * Key-value table for response headers.
 */

interface ResponseHeadersTableProps {
  headers: Record<string, string>;
}

export function ResponseHeadersTable({ headers }: ResponseHeadersTableProps) {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return <p className="p-4 text-sm text-gray-500">No headers.</p>;
  }
  return (
    <div className="overflow-auto font-mono text-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-bg-tertiary)]">
            <th className="px-3 py-2 text-left font-medium text-gray-400">Name</th>
            <th className="px-3 py-2 text-left font-medium text-gray-400">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-[var(--color-bg-tertiary)]/50">
              <td className="px-3 py-1.5 text-[var(--color-accent)]">{key}</td>
              <td className="break-all px-3 py-1.5 text-[var(--foreground)]">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
