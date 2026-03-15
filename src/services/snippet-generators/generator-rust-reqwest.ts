/**
 * Rust reqwest snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateRustReqwest(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const method = req.method.toLowerCase();
  const lines: string[] = [];

  lines.push('let client = reqwest::Client::new();');
  lines.push(`let response = client.${method}("${escapeDoubleQuoted(req.url)}")`);

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`    .header("${escapeDoubleQuoted(k)}", "${escapeDoubleQuoted(v)}")`);
  }

  if (hasBody) {
    lines.push(`    .body("${escapeDoubleQuoted(req.body!)}")`);
  }

  lines.push('    .send()');
  lines.push('    .await?;');
  lines.push('');
  lines.push('let body = response.text().await?;');
  lines.push('println!("{}", body);');

  return lines.join('\n');
}

registerGenerator('rust-reqwest', generateRustReqwest);
export { generateRustReqwest };
