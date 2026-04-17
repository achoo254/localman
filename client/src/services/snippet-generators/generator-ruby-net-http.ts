/**
 * Ruby Net::HTTP snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeJsString } from './snippet-escape-utils';

// Ruby single-quote escaping: same rules as JS single-quote strings
const escapeRubyString = escapeJsString;

function generateRubyNetHttp(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const lines: string[] = [];

  lines.push("require 'net/http'");
  lines.push("require 'uri'");
  lines.push("require 'json'");
  lines.push('');
  lines.push(`uri = URI.parse('${escapeRubyString(req.url)}')`);
  lines.push(`request = Net::HTTP::${capitalize(req.method)}.new(uri)`);

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`request['${escapeRubyString(k)}'] = '${escapeRubyString(v)}'`);
  }

  if (hasBody) {
    lines.push(`request.body = '${escapeRubyString(req.body!)}'`);
  }

  lines.push('');
  lines.push('response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|');
  lines.push('  http.request(request)');
  lines.push('end');
  lines.push('');
  lines.push('puts response.body');

  return lines.join('\n');
}

function capitalize(method: string): string {
  // Net::HTTP uses Get, Post, Put, Delete, Patch, Head, Options
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
}

registerGenerator('ruby-net-http', generateRubyNetHttp);
export { generateRubyNetHttp };
