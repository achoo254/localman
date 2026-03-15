/**
 * HTTPie snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeShellArg } from './snippet-escape-utils';

function generateHttpie(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const method = req.method.toLowerCase();
  const isJson = req.headers['Content-Type']?.includes('application/json');
  const parts: string[] = [];

  // HTTPie uses lowercase method names, GET is default
  if (method === 'get') {
    parts.push(`http '${escapeShellArg(req.url)}'`);
  } else {
    parts.push(`http ${method} '${escapeShellArg(req.url)}'`);
  }

  // Headers use Header:Value syntax
  for (const [k, v] of Object.entries(req.headers)) {
    if (k === 'Content-Type' && isJson) continue; // HTTPie auto-sets for JSON
    parts.push(`'${escapeShellArg(k)}:${escapeShellArg(v)}'`);
  }

  // Body: pipe raw body via stdin for both JSON and non-JSON
  if (hasBody) {
    const headerArgs = parts.slice(1).join(' ');
    const cmd = parts[0];
    const pipeParts = [`echo '${escapeShellArg(req.body!)}'`, '|', cmd];
    if (headerArgs) pipeParts.push(headerArgs);
    return pipeParts.join(' ');
  }

  if (parts.length <= 2) return parts.join(' ');
  return parts.join(' \\\n  ');
}

registerGenerator('httpie', generateHttpie);
export { generateHttpie };
