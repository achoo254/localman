/**
 * Table for response cookies (name, value, domain, path, etc.).
 */

import type { Cookie } from '../../types/response';

interface ResponseCookiesTableProps {
  cookies: Cookie[];
}

export function ResponseCookiesTable({ cookies }: ResponseCookiesTableProps) {
  if (cookies.length === 0) {
    return <p className="p-4 text-sm text-[var(--color-text-subtle)]">No cookies.</p>;
  }
  return (
    <div className="overflow-auto font-mono text-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-bg-tertiary)]">
            <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Name</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Value</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Domain</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Path</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((c) => (
            <tr key={c.name} className="border-b border-[var(--color-bg-tertiary)]/50">
              <td className="px-3 py-1.5 text-[var(--color-accent)]">{c.name}</td>
              <td className="max-w-[200px] truncate px-3 py-1.5 text-[var(--foreground)]" title={c.value}>
                {c.value}
              </td>
              <td className="px-3 py-1.5 text-[var(--color-text-muted)]">{c.domain ?? '—'}</td>
              <td className="px-3 py-1.5 text-[var(--color-text-muted)]">{c.path ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
