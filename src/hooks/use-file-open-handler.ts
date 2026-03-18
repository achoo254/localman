/**
 * Listens for 'file-open' events from Tauri backend (file association / single-instance)
 * and auto-imports the file content into Localman.
 */
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { importFromFileContent } from '../services/import-export-service';

export function useFileOpenHandler(onImported?: (name: string) => void) {
  useEffect(() => {
    const unlisten = listen<string>('file-open', async (event) => {
      try {
        const filePath = event.payload;
        const content = await readTextFile(filePath);
        const result = await importFromFileContent(content);
        if (result?.collectionName) {
          onImported?.(result.collectionName);
        }
      } catch (err) {
        console.error('[file-open] Failed to import file:', err);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onImported]);
}
