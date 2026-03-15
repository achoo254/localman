/**
 * Java OkHttp snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateJavaOkHttp(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const ct = req.headers['Content-Type'] || 'application/json';
  const lines: string[] = [];

  lines.push('OkHttpClient client = new OkHttpClient();');
  lines.push('');

  if (hasBody) {
    lines.push(`MediaType mediaType = MediaType.parse("${escapeDoubleQuoted(ct)}");`);
    lines.push(`RequestBody body = RequestBody.create(mediaType, "${escapeDoubleQuoted(req.body!)}");`);
    lines.push('');
  }

  lines.push('Request request = new Request.Builder()');
  lines.push(`    .url("${escapeDoubleQuoted(req.url)}")`);

  if (hasBody) {
    lines.push(`    .method("${req.method}", body)`);
  } else if (req.method !== 'GET') {
    lines.push(`    .method("${req.method}", null)`);
  }

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`    .addHeader("${escapeDoubleQuoted(k)}", "${escapeDoubleQuoted(v)}")`);
  }

  lines.push('    .build();');
  lines.push('');
  lines.push('Response response = client.newCall(request).execute();');
  lines.push('System.out.println(response.body().string());');

  return lines.join('\n');
}

registerGenerator('java-okhttp', generateJavaOkHttp);
export { generateJavaOkHttp };
