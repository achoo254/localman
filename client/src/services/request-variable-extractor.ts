/**
 * Extract unique {{var}} names used inside an ApiRequest across URL, params,
 * headers, body, and auth fields. Used by Variables-in-request panel (Case C).
 *
 * [RED TEAM H9] 100KB body scan guard to prevent main-thread stalls.
 * [RED TEAM M13] Whitelist auth fields per type instead of blind Object.values scan.
 * [RED TEAM H12] Skip empty `{{}}` capture.
 */

import type { ApiRequest } from '../types/models';

const VAR_PATTERN = /\{\{([^}]+)\}\}/g;

const MAX_BODY_SCAN_BYTES = 100_000;

/** Auth fields by type that may contain {{var}}. Nested oauth2Config skipped for MVP. */
type AuthStringField = 'bearerToken' | 'username' | 'password' | 'apiKeyHeader' | 'apiKeyValue';
const AUTH_VAR_FIELDS: Record<string, AuthStringField[]> = {
  bearer: ['bearerToken'],
  basic: ['username', 'password'],
  'api-key': ['apiKeyHeader', 'apiKeyValue'],
};

/** Extract unique {{var}} names from request. Preserves order of first appearance. */
export function extractUsedVariables(req: ApiRequest | null): string[] {
  if (!req) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  const scan = (s: string | undefined | null) => {
    if (!s) return;
    if (s.length > MAX_BODY_SCAN_BYTES) {
      console.warn(
        `[extractor] Skipping scan on ${s.length} byte string (limit ${MAX_BODY_SCAN_BYTES})`
      );
      return;
    }
    const re = new RegExp(VAR_PATTERN.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const name = m[1].trim();
      if (!name) continue;
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  };

  scan(req.url);
  req.params?.forEach(p => {
    scan(p.key);
    scan(p.value);
  });
  req.headers?.forEach(h => {
    scan(h.key);
    scan(h.value);
  });

  // Body: raw/json/xml store in `raw`; form/form-data store in `form`/`formData`.
  if (req.body) {
    if (req.body.type === 'json' || req.body.type === 'raw' || req.body.type === 'xml') {
      scan(req.body.raw);
    }
    if (req.body.type === 'form') {
      req.body.form?.forEach(p => {
        scan(p.key);
        scan(p.value);
      });
    }
    if (req.body.type === 'form-data') {
      req.body.formData?.forEach(p => {
        scan(p.key);
        scan(p.value);
      });
    }
  }

  // [RED TEAM M13] Whitelist auth fields per type.
  if (req.auth && req.auth.type !== 'none') {
    const fields = AUTH_VAR_FIELDS[req.auth.type] ?? [];
    for (const f of fields) {
      const v = req.auth[f];
      if (typeof v === 'string') scan(v);
    }
  }

  return out;
}
