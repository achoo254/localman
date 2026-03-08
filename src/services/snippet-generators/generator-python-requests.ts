/**
 * Python requests library snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapePythonString } from './snippet-escape-utils';

function generatePythonRequests(req: PreparedRequest): string {
  const lines: string[] = ['import requests', ''];
  const method = req.method.toLowerCase();
  const hasHeaders = Object.keys(req.headers).length > 0;
  const hasBody = !!req.body;
  const isJson = req.headers['Content-Type']?.includes('application/json');

  const args: string[] = [`'${escapePythonString(req.url)}'`];

  if (hasHeaders) {
    const hdrs = Object.entries(req.headers)
      .map(([k, v]) => `    '${escapePythonString(k)}': '${escapePythonString(v)}'`)
      .join(',\n');
    args.push(`headers={\n${hdrs}\n}`);
  }

  if (hasBody) {
    // Always pass body as string — let requests handle JSON serialization
    if (isJson) {
      lines.splice(1, 0, 'import json', '');
      args.push(`json=json.loads('${escapePythonString(req.body!)}')`);
    } else {
      args.push(`data='${escapePythonString(req.body!)}'`);
    }
  }

  if (args.length === 1) {
    lines.push(`response = requests.${method}(${args[0]})`);
  } else {
    const joined = args.join(',\n    ');
    lines.push(`response = requests.${method}(\n    ${joined}\n)`);
  }

  lines.push('print(response.json())');
  return lines.join('\n');
}

registerGenerator('python-requests', generatePythonRequests);
export { generatePythonRequests };
