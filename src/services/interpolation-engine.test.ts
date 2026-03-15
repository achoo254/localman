import { describe, it, expect } from 'vitest';
import { interpolate, interpolateString } from './interpolation-engine';

describe('interpolation-engine', () => {
  const ctx = {
    envVars: { baseUrl: 'https://api.example.com', token: 'secret123' },
    globalVars: { apiKey: 'global-key' },
  };

  it('replaces env and global vars', () => {
    const result = interpolate('{{baseUrl}}/users', ctx);
    expect(result.value).toBe('https://api.example.com/users');
    expect(result.unresolved).toEqual([]);
  });

  it('env overrides global when same key', () => {
    const withBoth = { envVars: { x: 'env' }, globalVars: { x: 'global' } };
    expect(interpolateString('{{x}}', withBoth)).toBe('env');
  });

  it('leaves unresolved as-is and tracks them', () => {
    const result = interpolate('{{baseUrl}}/{{missing}}', ctx);
    expect(result.value).toBe('https://api.example.com/{{missing}}');
    expect(result.unresolved).toContain('missing');
  });

  it('resolves dynamic $guid', () => {
    const result = interpolate('id={{$guid}}', ctx);
    expect(result.value).toMatch(/^id=[0-9a-f-]{36}$/);
  });

  it('resolves dynamic $timestamp', () => {
    const result = interpolate('t={{$timestamp}}', ctx);
    expect(result.value).toMatch(/^t=\d+$/);
  });
});
