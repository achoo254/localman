/**
 * Shared Tauri detection and HTTP client helper.
 * Used by cloud-auth-client, cloud-sync-service, and sync-http-client.
 */

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
    !!(window as unknown as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__
  );
}

export async function getHttpClient(): Promise<typeof fetch> {
  if (isTauri()) {
    try {
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
      return tauriFetch;
    } catch (err) {
      const e = new Error(
        "HTTP plugin unavailable. Sync requests cannot run in Tauri without the plugin."
      );
      (e as Error & { cause?: unknown }).cause = err;
      throw e;
    }
  }
  return globalThis.fetch.bind(globalThis);
}
