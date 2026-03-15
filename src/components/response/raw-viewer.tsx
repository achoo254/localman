/**
 * Plain text response body display (read-only).
 */

interface RawViewerProps {
  body: string;
}

export function RawViewer({ body }: RawViewerProps) {
  return (
    <pre className="p-4 font-mono text-sm text-[var(--foreground)] whitespace-pre-wrap break-words overflow-auto min-h-0">
      {body || '(empty)'}
    </pre>
  );
}
