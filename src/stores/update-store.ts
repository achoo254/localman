/**
 * Zustand store for app update state — tracks check/download/install lifecycle.
 * Actions include performCheck and handleDownloadAndInstall so any component
 * can trigger updates without prop drilling.
 */

import { create } from 'zustand'
import type { Update } from '@tauri-apps/plugin-updater'
import type { UpdateInfo, DownloadProgress } from '../services/update-checker-service'
import { checkForUpdates, downloadAndInstall } from '../services/update-checker-service'
import { toast } from '../components/common/toast-provider'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

interface UpdateState {
  status: UpdateStatus
  updateInfo: UpdateInfo | null
  update: Update | null
  progress: DownloadProgress | null
  dialogOpen: boolean
  error: string | null

  setDialogOpen: (open: boolean) => void
  performCheck: (manual: boolean) => Promise<void>
  handleDownloadAndInstall: () => Promise<void>
  reset: () => void
}

const initialState = {
  status: 'idle' as UpdateStatus,
  updateInfo: null,
  update: null,
  progress: null,
  dialogOpen: false,
  error: null,
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  ...initialState,

  setDialogOpen: (open) => set({ dialogOpen: open }),

  performCheck: async (manual) => {
    set({ status: 'checking', error: null })
    const result = await checkForUpdates()

    if (result) {
      set({ status: 'available', updateInfo: result.info, update: result.update })
      toast(`Update v${result.info.version} available`, {
        description: 'Go to Settings → About to install.',
      })
    } else {
      set(initialState)
      if (manual) toast('You\'re up to date', { variant: 'success' })
    }
  },

  handleDownloadAndInstall: async () => {
    const { update } = get()
    if (!update) return
    set({ status: 'downloading' })
    try {
      await downloadAndInstall(update, (progress) => set({ progress }))
    } catch (e) {
      set({ status: 'error', error: (e as Error).message })
    }
  },

  reset: () => set(initialState),
}))
