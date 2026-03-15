/**
 * Enums for HTTP and request builder.
 */

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'form' | 'form-data' | 'raw' | 'xml' | 'binary';

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2';
