/**
 * Dialog to choose target collection and folder when moving a request.
 */

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useLiveQuery } from '../../hooks/use-live-query';
import { db } from '../../db/database';

interface MoveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (collectionId: string, folderId: string | null) => Promise<void>;
}

export function MoveRequestDialog({
  open,
  onOpenChange,
  onConfirm,
}: MoveRequestDialogProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const collections = useLiveQuery(() => db.collections.orderBy('sort_order').toArray(), []);
  const folders = useLiveQuery(() => db.folders.toArray(), []);

  const collectionList = collections ?? [];
  const foldersInCollection = selectedCollectionId
    ? (folders ?? []).filter(f => f.collection_id === selectedCollectionId)
    : [];

  const handleMove = async () => {
    if (!selectedCollectionId) return;
    setSaving(true);
    try {
      await onConfirm(selectedCollectionId, selectedFolderId);
      onOpenChange(false);
      setSelectedCollectionId(null);
      setSelectedFolderId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-lg">
          <Dialog.Title className="text-sm font-medium">Move request</Dialog.Title>
          <p className="mt-1 text-xs text-gray-500">Choose target collection and folder.</p>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-gray-400">Collection</label>
            <select
              value={selectedCollectionId ?? ''}
              onChange={e => {
                setSelectedCollectionId(e.target.value || null);
                setSelectedFolderId(null);
              }}
              className="w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            >
              <option value="">Select…</option>
              {collectionList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCollectionId && (
              <>
                <label className="block text-xs text-gray-400">Folder (optional)</label>
                <select
                  value={selectedFolderId ?? ''}
                  onChange={e => setSelectedFolderId(e.target.value || null)}
                  className="w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
                >
                  <option value="">Root</option>
                  {foldersInCollection.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-[var(--foreground)]">
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={!selectedCollectionId || saving}
              onClick={handleMove}
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? '…' : 'Move'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
