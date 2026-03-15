/**
 * Auth tab: None, Bearer, Basic, API Key (no OAuth in MVP).
 */

import type { AuthConfig } from '../../types/common';
import type { AuthType } from '../../types/enums';
import { useEnvironmentStore } from '../../stores/environment-store';
import { interpolateString } from '../../services/interpolation-engine';
import { VariableHighlightInput } from '../common/variable-highlight-input';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api-key', label: 'API Key' },
];

interface AuthTabProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export function AuthTab({ auth, onChange }: AuthTabProps) {
  const setType = (type: AuthType) => onChange({ ...auth, type });
  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-1">
        {AUTH_TYPES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={auth.type === value}
            onClick={() => setType(value)}
            className={`rounded px-3 py-1.5 text-sm ${
              auth.type === value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {auth.type === 'bearer' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400">Token</label>
          <VariableHighlightInput
            value={auth.bearerToken ?? ''}
            onChange={v => onChange({ ...auth, bearerToken: v })}
            placeholder="Bearer token ({{token}})"
            type="password"
            getResolvedValue={() => interpolateString(auth.bearerToken ?? '', getInterpolationContext())}
          />
        </div>
      )}
      {auth.type === 'basic' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400">Username</label>
          <VariableHighlightInput
            value={auth.username ?? ''}
            onChange={v => onChange({ ...auth, username: v })}
            placeholder="Username ({{user}})"
            type="text"
            getResolvedValue={() => interpolateString(auth.username ?? '', getInterpolationContext())}
          />
          <label className="text-sm text-gray-400">Password</label>
          <VariableHighlightInput
            value={auth.password ?? ''}
            onChange={v => onChange({ ...auth, password: v })}
            placeholder="Password ({{pass}})"
            type="password"
            getResolvedValue={() => interpolateString(auth.password ?? '', getInterpolationContext())}
          />
        </div>
      )}
      {auth.type === 'api-key' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="auth-apikey-header" className="text-sm text-gray-400">Key (header name or query param)</label>
          <input
            id="auth-apikey-header"
            type="text"
            value={auth.apiKeyHeader ?? ''}
            onChange={e => onChange({ ...auth, apiKeyHeader: e.target.value })}
            placeholder="X-API-Key"
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <label className="text-sm text-gray-400">Value</label>
          <VariableHighlightInput
            value={auth.apiKeyValue ?? ''}
            onChange={v => onChange({ ...auth, apiKeyValue: v })}
            placeholder="API key value ({{var}})"
            type="password"
            getResolvedValue={() => interpolateString(auth.apiKeyValue ?? '', getInterpolationContext())}
          />
        </div>
      )}
    </div>
  );
}
