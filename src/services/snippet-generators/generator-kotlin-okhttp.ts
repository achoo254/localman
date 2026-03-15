/**
 * Kotlin OkHttp snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateKotlinOkHttp(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const ct = req.headers['Content-Type'] || 'application/json';
  const lines: string[] = [];

  lines.push('val client = OkHttpClient()');
  lines.push('');

  if (hasBody) {
    lines.push(`val mediaType = "${escapeDoubleQuoted(ct)}".toMediaType()`);
    lines.push(`val body = "${escapeDoubleQuoted(req.body!)}".toRequestBody(mediaType)`);
    lines.push('');
  }

  lines.push('val request = Request.Builder()');
  lines.push(`    .url("${escapeDoubleQuoted(req.url)}")`);

  if (hasBody) {
    lines.push(`    .method("${req.method}", body)`);
  } else if (req.method !== 'GET') {
    lines.push(`    .method("${req.method}", null)`);
  }

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`    .addHeader("${escapeDoubleQuoted(k)}", "${escapeDoubleQuoted(v)}")`);
  }

  lines.push('    .build()');
  lines.push('');
  lines.push('val response = client.newCall(request).execute()');
  lines.push('println(response.body?.string())');

  return lines.join('\n');
}

registerGenerator('kotlin-okhttp', generateKotlinOkHttp);
export { generateKotlinOkHttp };
