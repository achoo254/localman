/**
 * Captured console.log output from pre/post script.
 */

interface ScriptConsoleProps {
  lines: string[];
}

export function ScriptConsole({ lines }: ScriptConsoleProps) {
  if (lines.length === 0) return null;
  return (
    <div className="border-t border-[var(--color-bg-tertiary)] p-3 bg-[#0B1120]/80">
      <p className="text-xs text-slate-500 mb-2">Console</p>
      <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words max-h-32 overflow-auto">
        {lines.join('\n')}
      </pre>
    </div>
  );
}
