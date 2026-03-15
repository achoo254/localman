/**
 * Single request documentation card: method badge, URL, description, headers, params, auth, body.
 */

import { useMemo } from 'react';
import Markdown from 'react-markdown';
import type { ApiRequest } from '../../types/models';
import { interpolateString } from '../../services/interpolation-engine';
import { useEnvironmentStore } from '../../stores/environment-store';
import { METHOD_BADGE_CLASSES } from '../../utils/method-colors';

interface DocsRequestCardProps {
  request: ApiRequest;
}

export function DocsRequestCard({ request }: DocsRequestCardProps) {
  const methodColor = METHOD_BADGE_CLASSES[request.method] ?? 'text-slate-400 bg-slate-400/10';
  const enabledHeaders = request.headers.filter(h => h.enabled && h.key);
  const enabledParams = request.params.filter(p => p.enabled && p.key);
  const environments = useEnvironmentStore(s => s.environments);
  const globalVariables = useEnvironmentStore(s => s.globalVariables);

  /** Resolve {{vars}} to actual environment values. */
  const resolve = useMemo(() => {
    const active = environments.find(e => e.is_active) ?? null;
    const envVars: Record<string, string> = {};
    if (active) for (const v of active.variables) if (v.key?.trim()) envVars[v.key.trim()] = v.value ?? '';
    const globalVars: Record<string, string> = {};
    for (const v of globalVariables) if (v.key?.trim()) globalVars[v.key.trim()] = v.value ?? '';
    return (val: string) => interpolateString(val, { envVars, globalVars });
  }, [environments, globalVariables]);

  return (
    <div id={`req-${request.id}`} className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 mb-3 overflow-hidden">
      {/* Method + Name */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${methodColor}`}>
          {request.method}
        </span>
        <span className="text-sm font-medium text-slate-200 truncate">
          {request.name || resolve(request.url)}
        </span>
      </div>

      {/* URL */}
      {request.url && (
        <p className="text-xs text-slate-500 font-mono mb-2 break-all">{resolve(request.url)}</p>
      )}

      {/* Description */}
      {request.description && (
        <div className="text-xs text-slate-400 mb-3 prose-sm prose-invert max-w-none [&_p]:m-0 [&_p]:mb-1 [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded">
          <Markdown>{request.description}</Markdown>
        </div>
      )}

      {/* Auth */}
      {request.auth.type !== 'none' && (
        <div className="text-xs text-slate-500 mb-2">
          <span className="font-medium text-slate-400">Auth:</span> {request.auth.type}
        </div>
      )}

      {/* Params */}
      {enabledParams.length > 0 && (
        <details className="mb-2">
          <summary className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
            Parameters ({enabledParams.length})
          </summary>
          <table className="w-full mt-1 text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-3">Key</th>
                <th className="py-1 pr-3">Value</th>
                <th className="py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              {enabledParams.map(p => (
                <tr key={p.id} className="border-t border-[var(--color-bg-tertiary)]">
                  <td className="py-1 pr-3 font-mono text-slate-300">{p.key}</td>
                  <td className="py-1 pr-3 text-slate-400 break-all">{resolve(p.value)}</td>
                  <td className="py-1 text-slate-500">{p.description ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* Headers */}
      {enabledHeaders.length > 0 && (
        <details className="mb-2">
          <summary className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
            Headers ({enabledHeaders.length})
          </summary>
          <table className="w-full mt-1 text-xs table-fixed">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-3 w-1/4">Key</th>
                <th className="py-1 w-3/4">Value</th>
              </tr>
            </thead>
            <tbody>
              {enabledHeaders.map(h => (
                <tr key={h.id} className="border-t border-[var(--color-bg-tertiary)]">
                  <td className="py-1 pr-3 font-mono text-slate-300">{h.key}</td>
                  <td className="py-1 text-slate-400 break-all">{resolve(h.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* Body */}
      {request.body.type !== 'none' && request.body.raw && (
        <details>
          <summary className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
            Body ({request.body.type})
          </summary>
          <pre className="mt-1 rounded bg-[var(--color-bg-primary)] p-2 text-[11px] text-slate-300 overflow-auto max-h-[200px]">
            {resolve(request.body.raw)}
          </pre>
        </details>
      )}
    </div>
  );
}
