/**
 * Zustand store for app settings. Persists to Dexie via settings-service.
 */

import { create } from 'zustand';
import * as settingsService from '../db/services/settings-service';
import {
  SETTINGS_KEYS,
  DEFAULTS,
  type GeneralSettings,
  type EditorSettings,
  type ProxySettings,
  type UiFontSize,
} from '../types/settings';

const UI_FONT_SIZE_PX: Record<UiFontSize, number> = { small: 12, medium: 14, large: 16 };

function applyUiFontSize(value: UiFontSize) {
  const size = UI_FONT_SIZE_PX[value] != null ? value : 'medium';
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--font-size-base', `${UI_FONT_SIZE_PX[size]}px`);
  }
}

interface SettingsStore {
  general: GeneralSettings;
  editor: EditorSettings;
  proxy: ProxySettings;
  isLoading: boolean;

  load: () => Promise<void>;
  setGeneral: (v: Partial<GeneralSettings>) => Promise<void>;
  setEditor: (v: Partial<EditorSettings>) => Promise<void>;
  setProxy: (v: Partial<ProxySettings>) => Promise<void>;
}

const defaultGeneral: GeneralSettings = { ...DEFAULTS };
const defaultEditor: EditorSettings = {
  fontSize: DEFAULTS.fontSize,
  tabSize: DEFAULTS.tabSize,
  wordWrap: DEFAULTS.wordWrap,
  lineNumbers: DEFAULTS.lineNumbers,
};
const defaultProxy: ProxySettings = {
  enabled: DEFAULTS.proxyEnabled,
  httpUrl: DEFAULTS.httpUrl,
  httpsUrl: DEFAULTS.httpsUrl,
  noProxy: DEFAULTS.noProxy,
  username: DEFAULTS.proxyUsername,
  password: DEFAULTS.proxyPassword,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  general: defaultGeneral,
  editor: defaultEditor,
  proxy: defaultProxy,
  isLoading: false,

  async load() {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const [defaultMethod, defaultContentType, requestTimeoutMs, sslVerify, followRedirects, maxRedirects, uiFontSize, historyRetentionDays, fontSize, tabSize, wordWrap, lineNumbers, proxyEnabled, httpUrl, httpsUrl, noProxy, proxyUsername, proxyPassword] = await Promise.all([
        settingsService.get<string>(SETTINGS_KEYS.GENERAL_DEFAULT_METHOD),
        settingsService.get<string>(SETTINGS_KEYS.GENERAL_DEFAULT_CONTENT_TYPE),
        settingsService.get<number>(SETTINGS_KEYS.GENERAL_REQUEST_TIMEOUT_MS),
        settingsService.get<boolean>(SETTINGS_KEYS.GENERAL_SSL_VERIFY),
        settingsService.get<boolean>(SETTINGS_KEYS.GENERAL_FOLLOW_REDIRECTS),
        settingsService.get<number>(SETTINGS_KEYS.GENERAL_MAX_REDIRECTS),
        settingsService.get<string>(SETTINGS_KEYS.GENERAL_UI_FONT_SIZE),
        settingsService.get<number>(SETTINGS_KEYS.GENERAL_HISTORY_RETENTION_DAYS),
        settingsService.get<number>(SETTINGS_KEYS.EDITOR_FONT_SIZE),
        settingsService.get<number>(SETTINGS_KEYS.EDITOR_TAB_SIZE),
        settingsService.get<boolean>(SETTINGS_KEYS.EDITOR_WORD_WRAP),
        settingsService.get<boolean>(SETTINGS_KEYS.EDITOR_LINE_NUMBERS),
        settingsService.get<boolean>(SETTINGS_KEYS.PROXY_ENABLED),
        settingsService.get<string>(SETTINGS_KEYS.PROXY_HTTP_URL),
        settingsService.get<string>(SETTINGS_KEYS.PROXY_HTTPS_URL),
        settingsService.get<string>(SETTINGS_KEYS.PROXY_NO_PROXY),
        settingsService.get<string>(SETTINGS_KEYS.PROXY_USERNAME),
        settingsService.get<string>(SETTINGS_KEYS.PROXY_PASSWORD),
      ]);
      const resolvedUiFontSize: UiFontSize =
        (uiFontSize === 'small' || uiFontSize === 'medium' || uiFontSize === 'large')
          ? uiFontSize
          : defaultGeneral.uiFontSize;
      set({
        general: {
          defaultMethod: defaultMethod ?? defaultGeneral.defaultMethod,
          defaultContentType: defaultContentType ?? defaultGeneral.defaultContentType,
          requestTimeoutMs: requestTimeoutMs ?? defaultGeneral.requestTimeoutMs,
          sslVerify: sslVerify ?? defaultGeneral.sslVerify,
          followRedirects: followRedirects ?? defaultGeneral.followRedirects,
          maxRedirects: maxRedirects ?? defaultGeneral.maxRedirects,
          uiFontSize: resolvedUiFontSize,
          historyRetentionDays: historyRetentionDays ?? defaultGeneral.historyRetentionDays,
        },
        editor: {
          fontSize: fontSize ?? defaultEditor.fontSize,
          tabSize: tabSize ?? defaultEditor.tabSize,
          wordWrap: wordWrap ?? defaultEditor.wordWrap,
          lineNumbers: lineNumbers ?? defaultEditor.lineNumbers,
        },
        proxy: {
          enabled: proxyEnabled ?? defaultProxy.enabled,
          httpUrl: httpUrl ?? defaultProxy.httpUrl,
          httpsUrl: httpsUrl ?? defaultProxy.httpsUrl,
          noProxy: noProxy ?? defaultProxy.noProxy,
          username: proxyUsername ?? defaultProxy.username,
          password: proxyPassword ?? defaultProxy.password,
        },
      });
      applyUiFontSize(get().general.uiFontSize);
    } finally {
      set({ isLoading: false });
    }
  },

  async setGeneral(v) {
    const next = { ...get().general, ...v };
    set({ general: next });
    await Promise.all([
      settingsService.set(SETTINGS_KEYS.GENERAL_DEFAULT_METHOD, next.defaultMethod),
      settingsService.set(SETTINGS_KEYS.GENERAL_DEFAULT_CONTENT_TYPE, next.defaultContentType),
      settingsService.set(SETTINGS_KEYS.GENERAL_REQUEST_TIMEOUT_MS, next.requestTimeoutMs),
      settingsService.set(SETTINGS_KEYS.GENERAL_SSL_VERIFY, next.sslVerify),
      settingsService.set(SETTINGS_KEYS.GENERAL_FOLLOW_REDIRECTS, next.followRedirects),
      settingsService.set(SETTINGS_KEYS.GENERAL_MAX_REDIRECTS, next.maxRedirects),
      settingsService.set(SETTINGS_KEYS.GENERAL_UI_FONT_SIZE, next.uiFontSize),
      settingsService.set(SETTINGS_KEYS.GENERAL_HISTORY_RETENTION_DAYS, next.historyRetentionDays),
    ]);
    applyUiFontSize(next.uiFontSize);
  },

  async setEditor(v) {
    const next = { ...get().editor, ...v };
    set({ editor: next });
    await Promise.all([
      settingsService.set(SETTINGS_KEYS.EDITOR_FONT_SIZE, next.fontSize),
      settingsService.set(SETTINGS_KEYS.EDITOR_TAB_SIZE, next.tabSize),
      settingsService.set(SETTINGS_KEYS.EDITOR_WORD_WRAP, next.wordWrap),
      settingsService.set(SETTINGS_KEYS.EDITOR_LINE_NUMBERS, next.lineNumbers),
    ]);
  },

  async setProxy(v) {
    const next = { ...get().proxy, ...v };
    set({ proxy: next });
    await Promise.all([
      settingsService.set(SETTINGS_KEYS.PROXY_ENABLED, next.enabled),
      settingsService.set(SETTINGS_KEYS.PROXY_HTTP_URL, next.httpUrl),
      settingsService.set(SETTINGS_KEYS.PROXY_HTTPS_URL, next.httpsUrl),
      settingsService.set(SETTINGS_KEYS.PROXY_NO_PROXY, next.noProxy),
      settingsService.set(SETTINGS_KEYS.PROXY_USERNAME, next.username),
      settingsService.set(SETTINGS_KEYS.PROXY_PASSWORD, next.password),
    ]);
  },
}));
