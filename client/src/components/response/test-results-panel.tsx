/**
 * Post-script test results: pass/fail per lm.test() and script error.
 */

import { Check, X } from 'lucide-react';
import type { TestResult } from '../../stores/response-store';

interface TestResultsPanelProps {
  testResults: TestResult[];
  error?: string;
}

export function TestResultsPanel({ testResults, error }: TestResultsPanelProps) {
  const passed = testResults.filter(t => t.pass).length;
  const total = testResults.length;

  return (
    <div className="flex flex-col gap-2 p-4">
      {error && (
        <p className="text-sm text-red-400 font-mono" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        {passed}/{total} tests passed
      </p>
      <ul className="flex flex-col gap-1.5">
        {testResults.map((t, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 text-sm font-mono ${t.pass ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {t.pass ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
            <span>{t.name}</span>
            {!t.pass && t.message && <span className="text-red-300/80">— {t.message}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
