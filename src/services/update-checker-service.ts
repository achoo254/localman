/**
 * Tauri updater service — checks for updates via GitHub Releases,
 * downloads and installs new versions.
 */

import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { isTauri } from '../utils/tauri-http-client'

export interface UpdateInfo {
  version: string
  notes: string
  date: string
}

export interface DownloadProgress {
  downloaded: number
  total: number | null
}

/** Check for updates. Returns null if up-to-date, offline, or not in Tauri. */
export async function checkForUpdates(): Promise<{ info: UpdateInfo; update: Update } | null> {
  if (!isTauri()) return null
  try {
    const update = await check()
    if (!update) return null
    return {
      info: {
        version: update.version,
        notes: update.body ?? '',
        date: update.date ?? '',
      },
      update,
    }
  } catch {
    // Silently fail (offline, rate limited, endpoint not configured, etc.)
    return null
  }
}

/** Download, install, and relaunch the app. */
export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  let downloaded = 0
  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      onProgress?.({ downloaded: 0, total: event.data.contentLength ?? null })
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength
      onProgress?.({ downloaded, total: null })
    } else if (event.event === 'Finished') {
      onProgress?.({ downloaded, total: downloaded })
    }
  })
  await relaunch()
}
