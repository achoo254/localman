/**
 * JavaScript fetch() snippet generator with async/await.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeJsString } from './snippet-escape-utils';

function generateJsFetch(req: PreparedRequest): string {
  const hasHeaders = Object.keys(req.headers).length > 0;
  const hasBody = !!req.body;
  const needsOptions = req.method !== 'GET' || hasHeaders || hasBody;

  if (!needsOptions) {
    return `const response = await fetch('${escapeJsString(req.url)}');\nconst data = await response.json();`;
  }

  const opts: string[] = [];
  opts.push(`  method: '${req.method}'`);

  if (hasHeaders) {
    const hdrs = Object.entries(req.headers)
      .map(([k, v]) => `    '${escapeJsString(k)}': '${escapeJsString(v)}'`)
      .join(',\n');
    opts.push(`  headers: {\n${hdrs}\n  }`);
  }

  if (hasBody) {
    // Always embed body as a string literal — safer than raw interpolation
    opts.push(`  body: '${escapeJsString(req.body!)}'`);
  }

  return `const response = await fetch('${escapeJsString(req.url)}', {\n${opts.join(',\n')}\n});\nconst data = await response.json();`;
}

registerGenerator('javascript-fetch', generateJsFetch);
export { generateJsFetch };
