import { describe, it, expect } from 'vitest';
import type { ApiRequest } from '../types/models';
import { extractUsedVariables } from './request-variable-extractor';

function makeRequest(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    id: 'r1',
    collection_id: 'c1',
    folder_id: null,
    name: 'req',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
    sort_order: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('request-variable-extractor', () => {
  it('returns empty for null', () => {
    expect(extractUsedVariables(null)).toEqual([]);
  });

  it('extracts vars from url only', () => {
    const req = makeRequest({ url: '{{baseUrl}}/users/{{userId}}' });
    expect(extractUsedVariables(req)).toEqual(['baseUrl', 'userId']);
  });

  it('preserves first-appearance order and dedupes', () => {
    const req = makeRequest({
      url: '{{baseUrl}}/{{baseUrl}}/{{id}}',
      headers: [
        { id: 'h1', key: '{{id}}', value: '{{token}}', enabled: true },
      ],
    });
    expect(extractUsedVariables(req)).toEqual(['baseUrl', 'id', 'token']);
  });

  it('extracts from params and headers', () => {
    const req = makeRequest({
      url: '/a',
      params: [{ id: 'p1', key: 'q', value: '{{q}}', enabled: true }],
      headers: [{ id: 'h1', key: 'X-Env', value: '{{env}}', enabled: true }],
    });
    expect(extractUsedVariables(req)).toEqual(['q', 'env']);
  });

  it('extracts from json body raw', () => {
    const req = makeRequest({
      body: { type: 'json', raw: '{"id": "{{userId}}", "name": "{{name}}"}' },
    });
    expect(extractUsedVariables(req)).toEqual(['userId', 'name']);
  });

  it('extracts from form-data pairs', () => {
    const req = makeRequest({
      body: {
        type: 'form-data',
        formData: [
          { id: 'f1', key: 'file', value: '{{path}}', enabled: true },
        ],
      },
    });
    expect(extractUsedVariables(req)).toEqual(['path']);
  });

  it('extracts from form pairs', () => {
    const req = makeRequest({
      body: {
        type: 'form',
        form: [{ id: 'f1', key: 'k', value: '{{v}}', enabled: true }],
      },
    });
    expect(extractUsedVariables(req)).toEqual(['v']);
  });

  it('extracts bearer token', () => {
    const req = makeRequest({ auth: { type: 'bearer', bearerToken: '{{tok}}' } });
    expect(extractUsedVariables(req)).toEqual(['tok']);
  });

  it('extracts basic auth username + password', () => {
    const req = makeRequest({
      auth: { type: 'basic', username: '{{u}}', password: '{{p}}' },
    });
    expect(extractUsedVariables(req)).toEqual(['u', 'p']);
  });

  it('extracts api-key header + value', () => {
    const req = makeRequest({
      auth: { type: 'api-key', apiKeyHeader: '{{hname}}', apiKeyValue: '{{hval}}' },
    });
    expect(extractUsedVariables(req)).toEqual(['hname', 'hval']);
  });

  it('skips empty {{}}', () => {
    const req = makeRequest({ url: '/{{}}/{{valid}}' });
    expect(extractUsedVariables(req)).toEqual(['valid']);
  });

  it('skips body > 100KB guard', () => {
    const big = 'x'.repeat(100_001) + '{{skipped}}';
    const req = makeRequest({ body: { type: 'raw', raw: big } });
    expect(extractUsedVariables(req)).toEqual([]);
  });

  it('returns empty when no vars', () => {
    const req = makeRequest({ url: 'https://api.example.com/users' });
    expect(extractUsedVariables(req)).toEqual([]);
  });
});
