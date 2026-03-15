/**
 * JavaScript axios snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeJsString } from './snippet-escape-utils';

function generateAxios(req: PreparedRequest): string {
  const hasHeaders = Object.keys(req.headers).length > 0;
  const hasBody = !!req.body;
  const method = req.method.toLowerCase();

  const config: string[] = [];
  config.push(`  url: '${escapeJsString(req.url)}'`);
  config.push(`  method: '${method}'`);

  if (hasHeaders) {
    const hdrs = Object.entries(req.headers)
      .map(([k, v]) => `    '${escapeJsString(k)}': '${escapeJsString(v)}'`)
      .join(',\n');
    config.push(`  headers: {\n${hdrs}\n  }`);
  }

  if (hasBody) {
    config.push(`  data: '${escapeJsString(req.body!)}'`);
  }

  return `import axios from 'axios';\n\nconst { data } = await axios({\n${config.join(',\n')}\n});`;
}

registerGenerator('javascript-axios', generateAxios);
export { generateAxios };
