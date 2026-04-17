/**
 * Snippet generator registry: maps language keys to generator functions.
 * Each generator converts a PreparedRequest into idiomatic code for its language.
 */

import type { PreparedRequest } from '../../types/response';

export interface SnippetLanguage {
  key: string;
  label: string;
  /** CodeMirror language mode identifier */
  codemirrorMode: string;
}

export type SnippetGenerator = (req: PreparedRequest) => string;

export const SNIPPET_LANGUAGES: SnippetLanguage[] = [
  { key: 'curl', label: 'cURL', codemirrorMode: 'shell' },
  { key: 'javascript-fetch', label: 'JavaScript - fetch', codemirrorMode: 'javascript' },
  { key: 'javascript-axios', label: 'JavaScript - axios', codemirrorMode: 'javascript' },
  { key: 'python-requests', label: 'Python - requests', codemirrorMode: 'python' },
  { key: 'go-native', label: 'Go - net/http', codemirrorMode: 'go' },
  { key: 'java-httpurlconnection', label: 'Java - HttpURLConnection', codemirrorMode: 'java' },
  { key: 'java-okhttp', label: 'Java - OkHttp', codemirrorMode: 'java' },
  { key: 'php-curl', label: 'PHP - cURL', codemirrorMode: 'php' },
  { key: 'csharp-httpclient', label: 'C# - HttpClient', codemirrorMode: 'clike' },
  { key: 'ruby-net-http', label: 'Ruby - Net::HTTP', codemirrorMode: 'ruby' },
  { key: 'swift-urlsession', label: 'Swift - URLSession', codemirrorMode: 'swift' },
  { key: 'kotlin-okhttp', label: 'Kotlin - OkHttp', codemirrorMode: 'kotlin' },
  { key: 'dart-http', label: 'Dart - http', codemirrorMode: 'dart' },
  { key: 'rust-reqwest', label: 'Rust - reqwest', codemirrorMode: 'rust' },
  { key: 'powershell', label: 'PowerShell', codemirrorMode: 'powershell' },
  { key: 'httpie', label: 'HTTPie', codemirrorMode: 'shell' },
];

const generators = new Map<string, SnippetGenerator>();

export function registerGenerator(key: string, fn: SnippetGenerator): void {
  generators.set(key, fn);
}

export function generateSnippet(req: PreparedRequest, lang: string): string {
  const fn = generators.get(lang);
  if (!fn) return `// No generator for "${lang}"`;
  return fn(req);
}

export function getGenerator(key: string): SnippetGenerator | undefined {
  return generators.get(key);
}
