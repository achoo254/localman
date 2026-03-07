/**
 * Shared types for request builder and DB layer.
 */

import type { BodyType, AuthType } from './enums';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBody {
  type: BodyType;
  raw?: string;
  form?: KeyValuePair[];
  formData?: KeyValuePair[];
}

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  username?: string;
  password?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  // TODO(oauth2): Replace with a typed interface when OAuth2 is implemented.
  // Expected fields: grant_type, client_id, client_secret, token_url, scope,
  //   redirect_uri, access_token, refresh_token (all strings).
  oauth2Config?: Record<string, string>;
}
