/**
 * PHP cURL snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';

// PHP single-quote escaping: only ' and \ need escaping
function escapePhpString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function generatePhpCurl(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const lines: string[] = [];

  lines.push('<?php');
  lines.push('$ch = curl_init();');
  lines.push('');
  lines.push(`curl_setopt($ch, CURLOPT_URL, '${escapePhpString(req.url)}');`);
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');

  if (req.method !== 'GET') {
    lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${req.method}');`);
  }

  const headerEntries = Object.entries(req.headers);
  if (headerEntries.length > 0) {
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [');
    for (const [k, v] of headerEntries) {
      lines.push(`    '${escapePhpString(k)}: ${escapePhpString(v)}',`);
    }
    lines.push(']);');
  }

  if (hasBody) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${escapePhpString(req.body!)}');`);
  }

  lines.push('');
  lines.push('$response = curl_exec($ch);');
  lines.push('curl_close($ch);');
  lines.push('echo $response;');

  return lines.join('\n');
}

registerGenerator('php-curl', generatePhpCurl);
export { generatePhpCurl };
