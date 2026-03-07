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
  oauth2Config?: Record<string, string>;
}
