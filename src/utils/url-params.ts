/**
 * Bidirectional sync between URL query string and params (KeyValuePair).
 */

import type { KeyValuePair } from '../types/common';
import { newId } from '../db/utils';

export function parseQueryFromUrl(url: string): KeyValuePair[] {
  try {
    const u = new URL(url, 'https://dummy.local');
    const pairs: KeyValuePair[] = [];
    u.searchParams.forEach((value, key) => {
      pairs.push({ id: newId(), key, value, enabled: true });
    });
    return pairs;
  } catch {
    return [];
  }
}

export function buildUrlWithParams(url: string, params: KeyValuePair[]): string {
  try {
    const u = new URL(url, 'https://dummy.local');
    u.search = '';
    for (const p of params) {
      if (p.enabled && p.key.trim()) {
        u.searchParams.append(p.key.trim(), p.value);
      }
    }
    const query = u.searchParams.toString();
    const base = url.split('?')[0] ?? url;
    return query ? `${base}?${query}` : base;
  } catch {
    return url;
  }
}
