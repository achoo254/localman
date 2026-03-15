/**
 * Hook for background + manual update checking.
 * Mounts in App root — checks on startup and every 4 hours.
 */

import { useEffect, useRef } from 'react'
import { useUpdateStore } from '../stores/update-store'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

export function useUpdateChecker() {
  const performCheck = useUpdateStore((s) => s.performCheck)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    performCheck(false)
    intervalRef.current = setInterval(() => performCheck(false), CHECK_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [performCheck])
}
