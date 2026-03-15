/**
 * Typed settings keys and defaults for persistence in Dexie.
 */

export const SETTINGS_KEYS = {
  GENERAL_DEFAULT_METHOD: 'settings.general.defaultMethod',
  GENERAL_DEFAULT_CONTENT_TYPE: 'settings.general.defaultContentType',
  GENERAL_REQUEST_TIMEOUT_MS: 'settings.general.requestTimeoutMs',
  GENERAL_SSL_VERIFY: 'settings.general.sslVerify',
  GENERAL_FOLLOW_REDIRECTS: 'settings.general.followRedirects',
  GENERAL_MAX_REDIRECTS: 'settings.general.maxRedirects',
  GENERAL_UI_FONT_SIZE: 'settings.general.uiFontSize',
  GENERAL_HISTORY_RETENTION_DAYS: 'settings.general.historyRetentionDays',
  EDITOR_FONT_SIZE: 'settings.editor.fontSize',
  EDITOR_TAB_SIZE: 'settings.editor.tabSize',
  EDITOR_WORD_WRAP: 'settings.editor.wordWrap',
  EDITOR_LINE_NUMBERS: 'settings.editor.lineNumbers',
  PROXY_ENABLED: 'settings.proxy.enabled',
  PROXY_HTTP_URL: 'settings.proxy.httpUrl',
  PROXY_HTTPS_URL: 'settings.proxy.httpsUrl',
  PROXY_NO_PROXY: 'settings.proxy.noProxy',
  PROXY_USERNAME: 'settings.proxy.username',
  PROXY_PASSWORD: 'settings.proxy.password',
} as const;

export type UiFontSize = 'small' | 'medium' | 'large';

export const DEFAULTS = {
  defaultMethod: 'GET',
  defaultContentType: 'application/json',
  requestTimeoutMs: 30_000,
  sslVerify: true,
  followRedirects: true,
  maxRedirects: 5,
  historyRetentionDays: 0,
  uiFontSize: 'medium' as UiFontSize,
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  proxyEnabled: false,
  httpUrl: '',
  httpsUrl: '',
  noProxy: '',
  proxyUsername: '',
  proxyPassword: '',
} as const;

export interface GeneralSettings {
  defaultMethod: string;
  defaultContentType: string;
  requestTimeoutMs: number;
  sslVerify: boolean;
  followRedirects: boolean;
  maxRedirects: number;
  uiFontSize: UiFontSize;
  /** 0 = keep forever, 7/30/90 = auto-delete older entries */
  historyRetentionDays: number;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
}

export interface ProxySettings {
  enabled: boolean;
  httpUrl: string;
  httpsUrl: string;
  noProxy: string;
  username: string;
  password: string;
}
