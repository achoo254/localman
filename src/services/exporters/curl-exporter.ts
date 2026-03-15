/**
 * Export ApiRequest to cURL command string.
 * Uses interpolation context when provided for {{var}} and {{$dynamic}}.
 */

import type { ApiRequest } from '../../types/models';
import type { InterpolationContext } from '../interpolation-engine';
import { prepareRequest } from '../request-preparer';

function escapeSingleQuotes(s: string): string {
  return s.replace(/'/g, "'\\''");
}

/**
 * Generate a cURL command from request. Optionally pass context for variable interpolation.
 */
export function exportToCurl(
  request: ApiRequest,
  context?: InterpolationContext
): string {
  const prepared = prepareRequest(request, context);
  const parts: string[] = ['curl'];

  if (prepared.method && prepared.method !== 'GET') {
    parts.push('-X', prepared.method);
  }

  for (const [key, value] of Object.entries(prepared.headers)) {
    if (value == null || value === '') continue;
    const header = `${key}: ${value}`;
    parts.push('-H', `'${escapeSingleQuotes(header)}'`);
  }

  if (prepared.body !== undefined && prepared.body !== '') {
    parts.push('-d', `'${escapeSingleQuotes(prepared.body)}'`);
  }

  parts.push(`'${escapeSingleQuotes(prepared.url)}'`);
  return parts.join(' ');
}
