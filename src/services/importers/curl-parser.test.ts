/**
 * Unit tests for cURL parser.
 */

import { describe, it, expect } from 'vitest';
import { parseCurl, tokenizeCurl, parseCurlArgs } from './curl-parser';

describe('tokenizeCurl', () => {
  it('splits on spaces', () => {
    const tokens = tokenizeCurl('curl -X GET https://api.example.com');
    expect(tokens).toContain('curl');
    expect(tokens).toContain('-X');
    expect(tokens).toContain('GET');
    expect(tokens).toContain('https://api.example.com');
  });

  it('handles quoted header value', () => {
    const tokens = tokenizeCurl('curl -H "Content-Type: application/json" https://a.com');
    expect(tokens.some(t => t.includes('Content-Type'))).toBe(true);
  });

  it('collapses line continuation', () => {
    const tokens = tokenizeCurl('-X GET \\\n  https://api.example.com');
    expect(tokens[tokens.length - 1]).toBe('https://api.example.com');
  });
});

describe('parseCurl', () => {
  it('parses simple GET', () => {
    const result = parseCurl('curl https://api.example.com/users');
    expect(result.method).toBe('GET');
    expect(result.url).toBe('https://api.example.com/users');
    expect(result.headers).toEqual([]);
    expect(result.body?.type).toBe('none');
  });

  it('parses POST with JSON body', () => {
    const result = parseCurl(
      'curl -X POST -H "Content-Type: application/json" -d \'{"key":"val"}\' https://api.example.com'
    );
    expect(result.method).toBe('POST');
    expect(result.url).toBe('https://api.example.com');
    expect(result.headers?.some(h => h.key === 'Content-Type' && h.value.includes('json'))).toBe(true);
    expect(result.body?.type).toBe('raw');
    expect((result.body as { raw?: string }).raw).toContain('"key"');
  });

  it('parses basic auth with -u', () => {
    const result = parseCurl('curl -u user:pass https://api.example.com');
    expect(result.auth?.type).toBe('basic');
    expect(result.auth?.username).toBe('user');
    expect(result.auth?.password).toBe('pass');
  });

  it('defaults to POST when body present without -X', () => {
    const result = parseCurl('curl -d "foo=bar" https://api.example.com');
    expect(result.method).toBe('POST');
    expect((result.body as { raw?: string }).raw).toBe('foo=bar');
  });

  it('throws when input does not start with curl', () => {
    expect(() => parseCurl('wget https://a.com')).toThrow('Invalid cURL');
  });
});

describe('parseCurlArgs', () => {
  it('extracts URL as last non-flag argument', () => {
    const tokens = ['-X', 'GET', 'https://api.example.com'];
    const out = parseCurlArgs(tokens);
    expect(out.url).toBe('https://api.example.com');
    expect(out.method).toBe('GET');
  });
});
