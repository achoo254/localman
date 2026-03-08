/**
 * Swift URLSession snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateSwiftUrlSession(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const lines: string[] = [];

  lines.push('import Foundation');
  lines.push('');
  lines.push(`let url = URL(string: "${escapeDoubleQuoted(req.url)}")!`);
  lines.push('var request = URLRequest(url: url)');
  lines.push(`request.httpMethod = "${req.method}"`);

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`request.setValue("${escapeDoubleQuoted(v)}", forHTTPHeaderField: "${escapeDoubleQuoted(k)}")`);
  }

  if (hasBody) {
    lines.push(`request.httpBody = "${escapeDoubleQuoted(req.body!)}".data(using: .utf8)`);
  }

  lines.push('');
  lines.push('let (data, response) = try await URLSession.shared.data(for: request)');
  lines.push('print(String(data: data, encoding: .utf8) ?? "")');

  return lines.join('\n');
}

registerGenerator('swift-urlsession', generateSwiftUrlSession);
export { generateSwiftUrlSession };
