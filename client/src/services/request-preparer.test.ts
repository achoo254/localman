import { describe, it, expect } from 'vitest';
import { prepareRequest } from './request-preparer';
import type { ApiRequest } from '../types/models';
import { newId, now } from '../db/utils';

function baseRequest(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    id: newId(),
    collection_id: 'c1',
    folder_id: null,
    name: 'Test',
    method: 'GET',
    url: 'https://api.example.com/path',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
    sort_order: 0,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

describe('request-preparer', () => {
  it('builds URL and method for GET without body', () => {
    const req = baseRequest({ method: 'GET', url: 'https://example.com' });
    const out = prepareRequest(req);
    expect(out.method).toBe('GET');
    expect(out.url).toMatch(/^https:\/\/example\.com\/?$/);
    expect(out.body).toBeUndefined();
  });

  it('merges auth header for bearer', () => {
    const req = baseRequest({
      method: 'GET',
      auth: { type: 'bearer', bearerToken: 'token123' },
    });
    const out = prepareRequest(req);
    expect(out.headers['Authorization']).toBe('Bearer token123');
  });

  it('includes body and Content-Type for JSON', () => {
    const req = baseRequest({
      method: 'POST',
      body: { type: 'json', raw: '{"a":1}' },
    });
    const out = prepareRequest(req);
    expect(out.body).toBe('{"a":1}');
    expect(out.headers['Content-Type']).toBe('application/json');
  });
});
