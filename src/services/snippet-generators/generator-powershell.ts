/**
 * PowerShell Invoke-RestMethod snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted, escapePowershellSingleQuote } from './snippet-escape-utils';

function generatePowershell(req: PreparedRequest): string {
  const hasHeaders = Object.keys(req.headers).length > 0;
  const hasBody = !!req.body;
  const lines: string[] = [];

  if (hasHeaders) {
    lines.push('$headers = @{');
    for (const [k, v] of Object.entries(req.headers)) {
      lines.push(`    "${escapeDoubleQuoted(k)}" = "${escapeDoubleQuoted(v)}"`);
    }
    lines.push('}');
    lines.push('');
  }

  if (hasBody) {
    lines.push(`$body = '${escapePowershellSingleQuote(req.body!)}'`);
    lines.push('');
  }

  const params: string[] = [];
  params.push(`-Uri '${escapePowershellSingleQuote(req.url)}'`);
  params.push(`-Method ${req.method}`);
  if (hasHeaders) params.push('-Headers $headers');
  if (hasBody) params.push('-Body $body');

  if (params.length <= 2) {
    lines.push(`Invoke-RestMethod ${params.join(' ')}`);
  } else {
    lines.push(`Invoke-RestMethod \`\n    ${params.join(' `\n    ')}`);
  }

  return lines.join('\n');
}

registerGenerator('powershell', generatePowershell);
export { generatePowershell };
