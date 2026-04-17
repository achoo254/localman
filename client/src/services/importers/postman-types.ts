/**
 * Minimal Postman Collection v2.1 types for importer.
 * See https://schema.getpostman.com/json/collection/v2.1.0/
 */

export interface PostmanInfo {
  name: string;
  schema: string;
  _postman_id?: string;
  description?: string | { content?: string };
  /** Localman: collection updated_at for sync LWW (ISO 8601). */
  'x-localman-updated-at'?: string;
}

export interface PostmanAuthAttribute {
  key: string;
  value?: string | number | boolean;
  type?: string;
}

export interface PostmanAuth {
  type: 'noauth' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | string;
  bearer?: PostmanAuthAttribute[];
  basic?: PostmanAuthAttribute[];
  apikey?: PostmanAuthAttribute[];
  oauth2?: PostmanAuthAttribute[];
}

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string | string[];
  path?: string | string[];
  query?: Array<{ key?: string; value?: string; disabled?: boolean }>;
  variable?: Array<{ key?: string; value?: string }>;
}

export interface PostmanBody {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  urlencoded?: Array<{ key: string; value?: string; disabled?: boolean }>;
  formdata?: Array<{ key: string; value?: string; type?: string; disabled?: boolean }>;
  options?: Record<string, unknown>;
  disabled?: boolean;
}

export interface PostmanRequest {
  url?: string | PostmanUrl;
  method?: string;
  header?: PostmanHeader[] | string;
  body?: PostmanBody | null;
  auth?: PostmanAuth | null;
  description?: string | { content?: string };
}

export interface PostmanItem {
  id?: string;
  name?: string;
  request?: PostmanRequest | string;
  item?: PostmanItem[];
  description?: string | { content?: string };
  auth?: PostmanAuth | null;
  event?: Array<{ listen?: string; script?: { exec?: string[] | string } }>;
}

export interface PostmanVariable {
  key?: string;
  value?: string;
}

export interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth | null;
}
