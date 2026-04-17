/**
 * Java HttpURLConnection snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateJavaHttp(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const lines: string[] = [];

  lines.push('import java.net.*;');
  lines.push('import java.io.*;');
  lines.push('');
  lines.push(`URL url = new URL("${escapeDoubleQuoted(req.url)}");`);
  lines.push('HttpURLConnection con = (HttpURLConnection) url.openConnection();');
  lines.push(`con.setRequestMethod("${req.method}");`);

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`con.setRequestProperty("${escapeDoubleQuoted(k)}", "${escapeDoubleQuoted(v)}");`);
  }

  if (hasBody) {
    lines.push('con.setDoOutput(true);');
    lines.push('try (OutputStream os = con.getOutputStream()) {');
    lines.push(`    os.write("${escapeDoubleQuoted(req.body!)}".getBytes("UTF-8"));`);
    lines.push('}');
  }

  lines.push('');
  lines.push('int status = con.getResponseCode();');
  lines.push('BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));');
  lines.push('String line;');
  lines.push('StringBuilder response = new StringBuilder();');
  lines.push('while ((line = in.readLine()) != null) {');
  lines.push('    response.append(line);');
  lines.push('}');
  lines.push('in.close();');
  lines.push('System.out.println(response.toString());');

  return lines.join('\n');
}

registerGenerator('java-httpurlconnection', generateJavaHttp);
export { generateJavaHttp };
