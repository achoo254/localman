/**
 * Listens for 'file-open' events from Tauri backend (file association / single-instance)
 * and auto-imports the file content into Localman.
 */
import { useEffect } from 'react';
import { isTauri } from '../utils/tauri-http-client';

export function useFileOpenHandler(onImported?: (name: string) => void) {
  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const { importFromFileContent } = await import('../services/import-export-service');

      return listen<string>('file-open', async (event) => {
        if (cancelled) return;
        try {
          const content = await readTextFile(event.payload);
          const result = await importFromFileContent(content);
          if (result?.collectionName) {
            onImported?.(result.collectionName);
          }
        } catch (err) {
          console.error('[file-open] Failed to import file:', err);
        }
      });
    };

    const unlistenPromise = setup();

    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, [onImported]);
}
