/**
 * Parse cURL command string into Partial<ApiRequest>.
 * Handles -X, -H, -d/--data/--data-raw/--data-binary/--data-urlencode, -u (basic auth).
 */

import type { ApiRequest } from '../../types/models';
import type { KeyValuePair } from '../../types/common';
import type { HttpMethod } from '../../types/enums';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function kv(id: string, key: string, value: string, enabled = true): KeyValuePair {
  return { id, key, value, enabled };
}

function newId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Tokenize a cURL command: split on spaces but respect single/double quotes and backslash continuation.
 */
export function tokenizeCurl(line: string): string[] {
  const trimmed = line.trim().replace(/\\\s*\n/g, ' ');
  const out: string[] = [];
  let i = 0;
  while (i < trimmed.length) {
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
    if (i >= trimmed.length) break;
    if (trimmed[i] === '"' || trimmed[i] === "'") {
      const quote = trimmed[i];
      i++;
      let val = '';
      while (i < trimmed.length) {
        if (trimmed[i] === '\\' && i + 1 < trimmed.length) {
          val += trimmed[i + 1];
          i += 2;
          continue;
        }
        if (trimmed[i] === quote) {
          i++;
          break;
        }
        val += trimmed[i++];
      }
      out.push(val);
      continue;
    }
    let val = '';
    while (i < trimmed.length && !/\s/.test(trimmed[i])) {
      if (trimmed[i] === '\\' && i + 1 < trimmed.length) {
        val += trimmed[i + 1];
        i += 2;
      } else {
        val += trimmed[i++];
      }
    }
    if (val) out.push(val);
  }
  return out;
}

/**
 * Parse tokenized cURL args into method, url, headers, body, basic auth.
 */
export function parseCurlArgs(tokens: string[]): {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  body: string | undefined;
  username?: string;
  password?: string;
} {
  const headers: KeyValuePair[] = [];
  let method: HttpMethod = 'GET';
  let url = '';
  let body: string | undefined;
  let username: string | undefined;
  let password: string | undefined;

  let i = 0;
  const nonFlagArgs: string[] = [];

  while (i < tokens.length) {
    const t = tokens[i];
    if (t === '-X' || t === '--request') {
      const next = tokens[i + 1];
      if (next && HTTP_METHODS.includes(next as HttpMethod)) {
        method = next as HttpMethod;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (t === '-H' || t === '--header') {
      const raw = tokens[i + 1];
      if (raw) {
        const colon = raw.indexOf(':');
        if (colon !== -1) {
          const key = raw.slice(0, colon).trim();
          const value = raw.slice(colon + 1).trim();
          if (key) headers.push(kv(newId(), key, value));
        }
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (
      t === '-d' ||
      t === '--data' ||
      t === '--data-raw' ||
      t === '--data-binary' ||
      t === '--data-urlencode'
    ) {
      body = tokens[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (t === '-u' || t === '--user') {
      const cred = tokens[i + 1] ?? '';
      const sep = cred.indexOf(':');
      if (sep !== -1) {
        username = cred.slice(0, sep);
        password = cred.slice(sep + 1);
      } else {
        username = cred;
      }
      i += 2;
      continue;
    }
    if (t.startsWith('-')) {
      i++;
      if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
        if (tokens[i] && !tokens[i].startsWith('-')) body = tokens[i++];
      }
      continue;
    }
    nonFlagArgs.push(t);
    i++;
  }

  if (nonFlagArgs.length) url = nonFlagArgs[nonFlagArgs.length - 1];
  if (body !== undefined && method === 'GET') method = 'POST';

  return { method, url, headers, body, username, password };
}

/**
 * Parse a cURL command string into Partial<ApiRequest>.
 * Omits collection_id, folder_id, name, sort_order, created_at, updated_at (caller assigns).
 */
export function parseCurl(curlCommand: string): Partial<ApiRequest> {
  const normalized = curlCommand.trim();
  if (!normalized.toLowerCase().startsWith('curl')) {
    throw new Error('Invalid cURL: must start with curl');
  }
  const rest = normalized.slice(4).trim();
  const tokens = tokenizeCurl(rest);
  const { method, url, headers, body, username, password } = parseCurlArgs(tokens);

  const auth =
    username !== undefined
      ? {
          type: 'basic' as const,
          username: username ?? '',
          password: password ?? '',
        }
      : { type: 'none' as const };

  const bodyType = body !== undefined && body.length > 0 ? 'raw' : 'none';

  return {
    method,
    url: url || '',
    params: [],
    headers,
    body: bodyType === 'none' ? { type: 'none' } : { type: 'raw', raw: body },
    auth,
  };
}
