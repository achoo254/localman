/**
 * Keyboard shortcuts reference modal (Ctrl+/).
 */

import * as Dialog from '@radix-ui/react-dialog';
import { KEYBOARD_SHORTCUTS } from './keyboard-shortcuts-data';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-slate-200">Keyboard shortcuts</Dialog.Title>
          <div className="mt-4 flex flex-col gap-4">
            {KEYBOARD_SHORTCUTS.map(({ category, items }) => (
              <div key={category}>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{category}</p>
                <ul className="flex flex-col gap-1.5">
                  {items.map(([keys, desc]) => (
                    <li key={keys} className="flex justify-between items-center text-sm">
                      <kbd className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1 font-mono text-xs text-slate-300">
                        {keys}
                      </kbd>
                      <span className="text-slate-400">{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button type="button" className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
