/**
 * Types for HTTP response viewer and execution.
 */

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cookies: Cookie[];
  body: string;
  bodySize: number;
  responseTime: number;
  contentType: string;
}

export interface PreparedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}
