/**
 * Reusable Radix Dialog with a single name text input.
 * Used by collection and folder create/rename dialogs.
 */

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface NameInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  initialName?: string;
  confirmLabel: string;
  onConfirm: (name: string) => Promise<void>;
}

export function NameInputDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  initialName = '',
  confirmLabel,
  onConfirm,
}: NameInputDialogProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setName(initialName);
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onConfirm(trimmed);
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-lg">
          <Dialog.Title className="text-sm font-medium">{title}</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              aria-label={title}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={placeholder}
              className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-[var(--foreground)]">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? '…' : confirmLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
