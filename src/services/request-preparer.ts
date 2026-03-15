/**
 * Prepare ApiRequest for execution: URL with params, merged headers, auth, body.
 * Optional interpolation context for {{var}} and {{$dynamic}}.
 */

import type { ApiRequest } from '../types/models';
import type { KeyValuePair } from '../types/common';
import type { PreparedRequest } from '../types/response';
import type { InterpolationContext } from './interpolation-engine';
import { buildUrlWithParams } from '../utils/url-params';
import { getAuthHeaders } from './auth-handler';
import { interpolateString } from './interpolation-engine';

const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

function applyInterpolation(value: string, context: InterpolationContext | undefined): string {
  return context ? interpolateString(value, context) : value;
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

function buildBody(request: ApiRequest, context?: InterpolationContext): string | undefined {
  if (!BODY_METHODS.includes(request.method)) return undefined;
  const { body } = request;
  if (!body || body.type === 'none') return undefined;

  switch (body.type) {
    case 'json':
    case 'raw':
    case 'xml':
      return applyInterpolation(body.raw?.trim() ?? '', context) || undefined;
    case 'form': {
      const params = body.form ?? [];
      const encoded = params
        .filter(p => p.enabled && p.key.trim())
        .map(p =>
          `${encodeURIComponent(applyInterpolation(p.key.trim(), context))}=${encodeURIComponent(
            applyInterpolation(p.value, context)
          )}`
        )
        .join('&');
      return encoded || undefined;
    }
    case 'form-data':
      throw new Error('form-data body type is not yet supported. Use raw, JSON, or form-urlencoded instead.');
    default:
      return applyInterpolation(body.raw?.trim() ?? '', context) || undefined;
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

function interpolateAuth(
  auth: ApiRequest['auth'],
  context: InterpolationContext | undefined
): ApiRequest['auth'] {
  if (!auth || !context) return auth;
  const next = { ...auth };
  if (next.bearerToken) next.bearerToken = interpolateString(next.bearerToken, context);
  if (next.username != null) next.username = interpolateString(next.username, context);
  if (next.password != null) next.password = interpolateString(next.password, context);
  if (next.apiKeyValue != null) next.apiKeyValue = interpolateString(next.apiKeyValue, context);
  return next;
}

export function prepareRequest(
  request: ApiRequest,
  context?: InterpolationContext
): PreparedRequest {
  const url = buildUrlWithParams(
    applyInterpolation(request.url, context),
    request.params.map(p => ({
      ...p,
      key: applyInterpolation(p.key, context),
      value: applyInterpolation(p.value, context),
    }))
  );
  const rawHeaders = headersToRecord(request.headers);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    headers[applyInterpolation(k, context)] = applyInterpolation(v, context);
  }
  const authHeaders = getAuthHeaders(interpolateAuth(request.auth, context));
  const merged: Record<string, string> = { ...headers };
  for (const [k, v] of Object.entries(authHeaders)) {
    if (v) merged[k] = v;
  }
  const bodyStr = buildBody(request, context);
  const contentType = getContentType(request.body, merged);
  if (contentType) merged['Content-Type'] = contentType;

  return {
    method: request.method,
    url,
    headers: merged,
    body: bodyStr,
  };
}
