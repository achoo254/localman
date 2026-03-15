/**
 * cURL snippet generator. Produces a valid cURL command from PreparedRequest.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';

function esc(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function generateCurl(req: PreparedRequest): string {
  const parts: string[] = ['curl'];

  if (req.method !== 'GET') {
    parts.push(`-X ${req.method}`);
  }

  parts.push(`'${esc(req.url)}'`);

  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null || value === '') continue;
    parts.push(`-H '${esc(`${key}: ${value}`)}'`);
  }

  if (req.body) {
    parts.push(`-d '${esc(req.body)}'`);
  }

  // Multi-line for readability when > 1 flag
  if (parts.length <= 2) return parts.join(' ');
  return parts.join(' \\\n  ');
}

registerGenerator('curl', generateCurl);
export { generateCurl };
