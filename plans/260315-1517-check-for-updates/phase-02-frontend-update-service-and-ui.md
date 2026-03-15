# Phase 2: Frontend Update Service & UI

## Context
- [Tauri Updater JS API](../../backend/plans/reports/researcher-260315-1528-tauri-v2-updater-github-actions.md)
- Toast system: Radix + Zustand (`src/components/common/toast-provider.tsx`)
- Dialog pattern: Radix Dialog (`src/components/common/name-input-dialog.tsx`)
- About section: `src/components/settings/about-section.tsx`

## Overview
- **Priority:** P0
- **Status:** ✅ completed
- **Description:** Create update checker service, hook, UI dialog, and wire to existing About section button + background check.

## Key Insights
- Toast system uses `useToastStore` with `toast()` helper — reuse for update notifications
- All dialogs use Radix `@radix-ui/react-dialog` — follow same pattern
- Version already available from `@tauri-apps/api/app` → `getVersion()`
- Zustand pattern: one store per domain

## Architecture

```
┌─ App.tsx mount ─────────────────────────────┐
│  useUpdateChecker() hook                    │
│  ├─ checkForUpdates() on mount              │
│  ├─ setInterval(4h) for periodic check      │
│  └─ Exposes: checkManually(), updateInfo    │
│                                             │
│  If update available:                       │
│    toast("Update v0.2.0 available")         │
│    → User clicks → open UpdateDialog       │
│    → Download with progress                 │
│    → Install + relaunch                     │
└─────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Create update service
**File:** `src/services/update-checker-service.ts`

```typescript
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export interface UpdateInfo {
  version: string
  notes: string
  date: string
}

export interface DownloadProgress {
  downloaded: number
  total: number | null
}

// Check for updates, returns null if up-to-date or offline
export async function checkForUpdates(): Promise<{ info: UpdateInfo; update: Update } | null> {
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
    // Silently fail (offline, rate limited, etc.)
    return null
  }
}

// Download + install + relaunch
export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: DownloadProgress) => void
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
```

### 2. Create Zustand store
**File:** `src/stores/update-store.ts`

```typescript
import { create } from 'zustand'
import type { Update } from '@tauri-apps/plugin-updater'
import type { UpdateInfo, DownloadProgress } from '../services/update-checker-service'

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
  updateInfo: UpdateInfo | null
  update: Update | null  // Tauri Update instance for download/install
  progress: DownloadProgress | null
  dialogOpen: boolean
  error: string | null

  setChecking: () => void
  setAvailable: (info: UpdateInfo, update: Update) => void
  setDownloading: () => void
  setProgress: (progress: DownloadProgress) => void
  setReady: () => void
  setError: (error: string) => void
  setDialogOpen: (open: boolean) => void
  reset: () => void
}

export const useUpdateStore = create<UpdateState>((set) => ({
  status: 'idle',
  updateInfo: null,
  update: null,
  progress: null,
  dialogOpen: false,
  error: null,

  setChecking: () => set({ status: 'checking', error: null }),
  setAvailable: (info, update) => set({ status: 'available', updateInfo: info, update }),
  setDownloading: () => set({ status: 'downloading' }),
  setProgress: (progress) => set({ progress }),
  setReady: () => set({ status: 'ready' }),
  setError: (error) => set({ status: 'error', error }),
  setDialogOpen: (open) => set({ dialogOpen: open }),
  reset: () => set({ status: 'idle', updateInfo: null, update: null, progress: null, dialogOpen: false, error: null }),
}))
```

### 3. Create update checker hook
**File:** `src/hooks/use-update-checker.ts`

```typescript
import { useEffect, useCallback, useRef } from 'react'
import { useUpdateStore } from '../stores/update-store'
import { checkForUpdates, downloadAndInstall } from '../services/update-checker-service'
import { toast } from '../components/common/toast-provider'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

export function useUpdateChecker() {
  const store = useUpdateStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const performCheck = useCallback(async (manual = false) => {
    store.setChecking()
    const result = await checkForUpdates()

    if (result) {
      store.setAvailable(result.info, result.update)
      toast(`Update v${result.info.version} available`, 'default')
    } else {
      store.reset()
      if (manual) toast('You\'re up to date', 'success')
    }
  }, [])

  const handleDownloadAndInstall = useCallback(async () => {
    const { update } = useUpdateStore.getState()
    if (!update) return
    store.setDownloading()
    try {
      await downloadAndInstall(update, (progress) => store.setProgress(progress))
    } catch (e) {
      store.setError((e as Error).message)
    }
  }, [])

  // Background check on mount + interval
  useEffect(() => {
    performCheck(false)
    intervalRef.current = setInterval(() => performCheck(false), CHECK_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [performCheck])

  return {
    checkManually: () => performCheck(true),
    downloadAndInstall: handleDownloadAndInstall,
  }
}
```

### 4. Create Update Dialog component
**File:** `src/components/settings/update-dialog.tsx`

- Radix Dialog following existing patterns
- Shows: version, release notes (react-markdown), download progress bar
- Buttons: "Download & Install" / "Later"
- Progress state: percentage bar during download

### 5. Update About section
**File:** `src/components/settings/about-section.tsx`

- Remove hardcoded `APP_VERSION`, use `getVersion()` from `@tauri-apps/api/app`
- Wire "Check for updates" button to `checkManually()`
- Show update status (checking spinner, update available badge)

### 6. Mount hook in App.tsx
- Add `useUpdateChecker()` call in App root
- Render `<UpdateDialog />` in App root

## Related Code Files
- Create: `src/services/update-checker-service.ts`
- Create: `src/stores/update-store.ts`
- Create: `src/hooks/use-update-checker.ts`
- Create: `src/components/settings/update-dialog.tsx`
- Modify: `src/components/settings/about-section.tsx`
- Modify: `src/App.tsx` (mount hook + dialog)

## Todo
- [x] Create update-checker-service.ts
- [x] Create update-store.ts
- [x] Create use-update-checker.ts
- [x] Create update-dialog.tsx (Radix Dialog)
- [x] Update about-section.tsx (remove hardcode, wire button)
- [x] Mount useUpdateChecker in App.tsx
- [x] Render UpdateDialog in App.tsx
- [x] Verify pnpm type-check passes
- [x] Test manual check flow (shows "up to date" when no update)
- [x] Test dialog open/close

## Success Criteria
- Manual "Check for Updates" button works (shows toast)
- Background check runs on app startup
- Update Dialog shows version + notes + progress bar
- Download + install + relaunch flow works end-to-end
- Graceful handling when offline (no error, silent skip)

## Risk Assessment
- `check()` may throw if endpoint URL not yet configured → handle in try/catch
- Progress events format may differ per platform → test all 3
- relaunch() may not work in dev mode → only test in built app
