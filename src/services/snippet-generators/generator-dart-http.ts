/**
 * Dart http package snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeJsString } from './snippet-escape-utils';

// Dart single-quote escaping follows same rules as JS
const escapeDartString = escapeJsString;

function generateDartHttp(req: PreparedRequest): string {
  const hasHeaders = Object.keys(req.headers).length > 0;
  const hasBody = !!req.body;
  const method = req.method.toLowerCase();
  const lines: string[] = [];

  lines.push("import 'package:http/http.dart' as http;");
  lines.push('');
  lines.push(`final url = Uri.parse('${escapeDartString(req.url)}');`);

  const args: string[] = ['url'];

  if (hasHeaders) {
    const hdrs = Object.entries(req.headers)
      .map(([k, v]) => `    '${escapeDartString(k)}': '${escapeDartString(v)}'`)
      .join(',\n');
    args.push(`headers: {\n${hdrs}\n  }`);
  }

  if (hasBody) {
    args.push(`body: '${escapeDartString(req.body!)}'`);
  }

  if (args.length === 1) {
    lines.push(`final response = await http.${method}(${args[0]});`);
  } else {
    lines.push(`final response = await http.${method}(\n  ${args.join(',\n  ')}\n);`);
  }

  lines.push('print(response.body);');

  return lines.join('\n');
}

registerGenerator('dart-http', generateDartHttp);
export { generateDartHttp };
