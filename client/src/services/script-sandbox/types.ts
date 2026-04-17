/**
 * Types for script sandbox: pre/post context and results.
 */

export interface ScriptRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface ScriptResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

export interface PreScriptPayload {
  type: 'pre';
  script: string;
  request: ScriptRequest;
  variables: Record<string, string>;
}

export interface PostScriptPayload {
  type: 'post';
  script: string;
  request: ScriptRequest;
  variables: Record<string, string>;
  response: ScriptResponse;
}

export type SandboxPayload = PreScriptPayload | PostScriptPayload;

export interface PreScriptResult {
  modifiedRequest: ScriptRequest;
  newVars: Record<string, string>;
  console: string[];
  error?: string;
}

export interface TestResult {
  name: string;
  pass: boolean;
  message?: string;
}

export interface PostScriptResult {
  testResults: TestResult[];
  newVars: Record<string, string>;
  console: string[];
  error?: string;
}
