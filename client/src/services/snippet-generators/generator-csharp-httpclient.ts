/**
 * C# HttpClient snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateCsharpHttpClient(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const ct = req.headers['Content-Type'] || 'application/json';
  const lines: string[] = [];

  lines.push('using var client = new HttpClient();');
  lines.push('');

  // Non-Content-Type headers
  for (const [k, v] of Object.entries(req.headers)) {
    if (k === 'Content-Type') continue;
    lines.push(`client.DefaultRequestHeaders.Add("${escapeDoubleQuoted(k)}", "${escapeDoubleQuoted(v)}");`);
  }

  if (hasBody) {
    lines.push(`var content = new StringContent("${escapeDoubleQuoted(req.body!)}", System.Text.Encoding.UTF8, "${escapeDoubleQuoted(ct)}");`);
    // DELETE doesn't accept content param — use SendAsync with HttpRequestMessage
    if (req.method === 'DELETE') {
      lines.push(`var request = new HttpRequestMessage(HttpMethod.Delete, "${escapeDoubleQuoted(req.url)}") { Content = content };`);
      lines.push('var response = await client.SendAsync(request);');
    } else {
      lines.push(`var response = await client.${methodToCsharp(req.method)}("${escapeDoubleQuoted(req.url)}", content);`);
    }
  } else {
    lines.push(`var response = await client.${methodToCsharp(req.method)}("${escapeDoubleQuoted(req.url)}");`);
  }

  lines.push('var body = await response.Content.ReadAsStringAsync();');
  lines.push('Console.WriteLine(body);');

  return lines.join('\n');
}

function methodToCsharp(method: string): string {
  const map: Record<string, string> = {
    GET: 'GetAsync', POST: 'PostAsync', PUT: 'PutAsync',
    DELETE: 'DeleteAsync', PATCH: 'PatchAsync',
  };
  return map[method] ?? 'SendAsync';
}

registerGenerator('csharp-httpclient', generateCsharpHttpClient);
export { generateCsharpHttpClient };
