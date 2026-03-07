/**
 * Generate auth headers from AuthConfig for HTTP requests.
 */

import type { AuthConfig } from '../types/common';

export function getAuthHeaders(auth: AuthConfig): Record<string, string> {
  if (!auth || auth.type === 'none') return {};

  switch (auth.type) {
    case 'bearer':
      if (auth.bearerToken?.trim()) {
        return { Authorization: `Bearer ${auth.bearerToken.trim()}` };
      }
      return {};
    case 'basic':
      if (auth.username?.trim() && auth.password?.trim()) {
        const encoded = btoa(`${auth.username}:${auth.password}`);
        return { Authorization: `Basic ${encoded}` };
      }
      return {};
    case 'api-key':
      if (auth.apiKeyHeader?.trim() && auth.apiKeyValue != null) {
        return { [auth.apiKeyHeader.trim()]: auth.apiKeyValue };
      }
      return {};
    case 'oauth2':
      if (auth.oauth2Config?.access_token) {
        return { Authorization: `Bearer ${auth.oauth2Config.access_token}` };
      }
      return {};
    default:
      return {};
  }
}
