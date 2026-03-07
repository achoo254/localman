/**
 * Auth tab: None, Bearer, Basic, API Key (no OAuth in MVP).
 */

import type { AuthConfig } from '../../types/common';
import type { AuthType } from '../../types/enums';

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
          <label htmlFor="auth-bearer-token" className="text-sm text-gray-400">Token</label>
          <input
            id="auth-bearer-token"
            type="password"
            value={auth.bearerToken ?? ''}
            onChange={e => onChange({ ...auth, bearerToken: e.target.value })}
            placeholder="Bearer token"
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
      )}
      {auth.type === 'basic' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="auth-basic-username" className="text-sm text-gray-400">Username</label>
          <input
            id="auth-basic-username"
            type="text"
            value={auth.username ?? ''}
            onChange={e => onChange({ ...auth, username: e.target.value })}
            placeholder="Username"
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <label htmlFor="auth-basic-password" className="text-sm text-gray-400">Password</label>
          <input
            id="auth-basic-password"
            type="password"
            value={auth.password ?? ''}
            onChange={e => onChange({ ...auth, password: e.target.value })}
            placeholder="Password"
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
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
          <label htmlFor="auth-apikey-value" className="text-sm text-gray-400">Value</label>
          <input
            id="auth-apikey-value"
            type="password"
            value={auth.apiKeyValue ?? ''}
            onChange={e => onChange({ ...auth, apiKeyValue: e.target.value })}
            placeholder="API key value"
            className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
      )}
    </div>
  );
}
