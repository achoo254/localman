/**
 * Update dialog — shows version, release notes, download progress.
 * Opens from About section when an update is available.
 */

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useUpdateStore } from '../../stores/update-store'

export function UpdateDialog() {
  const { status, updateInfo, progress, dialogOpen, error } = useUpdateStore()
  const setDialogOpen = useUpdateStore((s) => s.setDialogOpen)
  const handleDownloadAndInstall = useUpdateStore((s) => s.handleDownloadAndInstall)

  const isDownloading = status === 'downloading'
  const progressPercent =
    progress?.total && progress.total > 0
      ? Math.round((progress.downloaded / progress.total) * 100)
      : null

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-bg-tertiary)] px-5 py-4">
            <Dialog.Title className="text-sm font-semibold text-[var(--foreground)]">
              Update Available
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {updateInfo && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-medium text-[var(--color-accent)]">
                    v{updateInfo.version}
                  </span>
                  {updateInfo.date && (
                    <span className="text-xs text-slate-500">{updateInfo.date}</span>
                  )}
                </div>

                {updateInfo.notes && (
                  <div className="max-h-48 overflow-y-auto rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] p-3 text-xs text-slate-300 prose prose-invert prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown>{updateInfo.notes}</ReactMarkdown>
                  </div>
                )}
              </>
            )}

            {isDownloading && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                    style={{ width: progressPercent != null ? `${progressPercent}%` : '50%' }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {progressPercent != null
                    ? `Downloading... ${progressPercent}%`
                    : 'Downloading...'}
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">Error: {error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[var(--color-bg-tertiary)] px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-[var(--foreground)]"
              >
                Later
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadAndInstall}
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isDownloading ? 'Installing...' : 'Download & Install'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
