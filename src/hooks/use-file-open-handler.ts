/**
 * Listens for 'file-open' events from Tauri backend (file association / single-instance)
 * and auto-imports the file content into Localman.
 *
 * On first launch, also checks for a startup file passed via CLI args
 * (handles the race condition where .setup() emits before React mounts).
 */
import { useEffect } from 'react';
import { isTauri } from '../utils/tauri-http-client';

async function importFile(filePath: string, onImported?: (name: string) => void) {
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  const { importFromFileContent } = await import('../services/import-export-service');
  const content = await readTextFile(filePath);
  const result = await importFromFileContent(content);
  if (result?.collectionName) {
    onImported?.(result.collectionName);
  }
}

export function useFileOpenHandler(onImported?: (name: string) => void) {
  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { invoke } = await import('@tauri-apps/api/core');

      // Check for file passed at startup (before frontend was ready)
      try {
        const startupFile = await invoke<string | null>('get_startup_file');
        if (startupFile && !cancelled) {
          await importFile(startupFile, onImported);
        }
      } catch (err) {
        console.error('[file-open] Failed to check startup file:', err);
      }

      // Listen for files opened via single-instance (app already running)
      return listen<string>('file-open', async (event) => {
        if (cancelled) return;
        try {
          await importFile(event.payload, onImported);
        } catch (err) {
          console.error('[file-open] Failed to import file:', err);
        }
      });
    };

    const unlistenPromise = setup();

    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn?.()).catch(() => {});
    };
  }, [onImported]);
}
