/**
 * API base URL utility — returns empty string for same-origin (web deploy),
 * or full URL from VITE_API_URL for Tauri desktop.
 */

/** Returns API base URL. Empty string for same-origin (web), full URL for Tauri desktop. */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? ''
}

/** Derives WebSocket URL from API base. */
export function getWsBaseUrl(): string {
  const base = getApiBaseUrl()
  if (!base) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${location.host}`
  }
  return base.replace(/^http/, 'ws')
}
