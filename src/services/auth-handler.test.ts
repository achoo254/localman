import { describe, it, expect } from 'vitest';
import { getAuthHeaders } from './auth-handler';

describe('auth-handler', () => {
  it('returns empty object for none auth', () => {
    expect(getAuthHeaders({ type: 'none' })).toEqual({});
  });

  it('returns Bearer header for bearer token', () => {
    expect(getAuthHeaders({ type: 'bearer', bearerToken: 'abc' })).toEqual({
      Authorization: 'Bearer abc',
    });
  });

  it('returns Basic header for username/password', () => {
    const headers = getAuthHeaders({ type: 'basic', username: 'u', password: 'p' });
    expect(headers.Authorization).toMatch(/^Basic /);
    expect(atob(headers.Authorization!.slice(6))).toBe('u:p');
  });

  it('returns custom header for api-key', () => {
    expect(
      getAuthHeaders({ type: 'api-key', apiKeyHeader: 'X-Key', apiKeyValue: 'secret' })
    ).toEqual({ 'X-Key': 'secret' });
  });
});
