/**
 * Prepare ApiRequest for execution: URL with params, merged headers, auth, body.
 * Variable interpolation is stubbed (pass-through) until Phase 06.
 */

import type { ApiRequest } from '../types/models';
import type { KeyValuePair } from '../types/common';
import type { PreparedRequest } from '../types/response';
import { buildUrlWithParams } from '../utils/url-params';
import { getAuthHeaders } from './auth-handler';

const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

function interpolateStub(value: string): string {
  return value;
}

function headersToRecord(pairs: KeyValuePair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of pairs) {
    if (p.enabled && p.key.trim()) {
      out[p.key.trim()] = p.value;
    }
  }
  return out;
}

function buildBody(request: ApiRequest): string | undefined {
  if (!BODY_METHODS.includes(request.method)) return undefined;
  const { body } = request;
  if (!body || body.type === 'none') return undefined;

  switch (body.type) {
    case 'json':
    case 'raw':
    case 'xml':
      return body.raw?.trim() || undefined;
    case 'form': {
      const params = body.form ?? [];
      const encoded = params
        .filter(p => p.enabled && p.key.trim())
        .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
        .join('&');
      return encoded || undefined;
    }
    case 'form-data':
      return undefined;
    default:
      return body.raw?.trim() || undefined;
  }
}

function getContentType(body: ApiRequest['body'], headers: Record<string, string>): string | undefined {
  if (headers['Content-Type']?.trim()) return undefined;
  if (!body || body.type === 'none') return undefined;
  switch (body.type) {
    case 'json':
      return 'application/json';
    case 'form':
      return 'application/x-www-form-urlencoded';
    case 'xml':
      return 'application/xml';
    default:
      return 'text/plain';
  }
}

export function prepareRequest(request: ApiRequest): PreparedRequest {
  const url = buildUrlWithParams(
    interpolateStub(request.url),
    request.params
  );
  const headers = headersToRecord(request.headers);
  const authHeaders = getAuthHeaders(request.auth);
  const merged: Record<string, string> = { ...headers };
  for (const [k, v] of Object.entries(authHeaders)) {
    if (v) merged[k] = v;
  }
  const bodyStr = buildBody(request);
  const contentType = getContentType(request.body, merged);
  if (contentType) merged['Content-Type'] = contentType;

  return {
    method: request.method,
    url,
    headers: merged,
    body: bodyStr,
  };
}
