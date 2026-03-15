/**
 * About: app version (from Tauri API), check for updates button.
 */

import { useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { useUpdateStore } from '../../stores/update-store'
import { Loader2 } from 'lucide-react'

export function AboutSection() {
  const [version, setVersion] = useState<string>('')
  const status = useUpdateStore((s) => s.status)
  const performCheck = useUpdateStore((s) => s.performCheck)
  const setDialogOpen = useUpdateStore((s) => s.setDialogOpen)

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('0.1.0'))
  }, [])

  const isChecking = status === 'checking'
  const isAvailable = status === 'available'

  function handleClick() {
    if (isAvailable) {
      setDialogOpen(true)
    } else {
      performCheck(true)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">About</h2>
      <p className="text-sm text-slate-400">
        Localman <span className="text-slate-300 font-mono">v{version}</span>
      </p>
      <p className="text-xs text-slate-500">
        Offline-first API client. Data stays on your machine.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isChecking}
        className="flex items-center gap-2 rounded bg-[var(--color-bg-tertiary)] px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 w-fit disabled:opacity-50"
      >
        {isChecking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {isAvailable ? 'Update available — View details' : 'Check for updates'}
      </button>
    </div>
  )
}
