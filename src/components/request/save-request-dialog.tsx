/**
 * Dialog for saving a draft request to a collection/folder.
 */

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useLiveQuery } from '../../hooks/use-live-query';
import { db } from '../../db/database';

interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftTabId: string | null;
  prefillCollectionId?: string;
  prefillFolderId?: string | null;
  draftName?: string;
  onSave: (tabId: string, name: string, collectionId: string, folderId: string | null) => Promise<void>;
}

export function SaveRequestDialog({
  open,
  onOpenChange,
  draftTabId,
  prefillCollectionId,
  prefillFolderId,
  draftName,
  onSave,
}: SaveRequestDialogProps) {
  const [name, setName] = useState(draftName ?? 'New Request');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(prefillCollectionId ?? null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(prefillFolderId ?? null);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const collections = useLiveQuery(() => db.collections.orderBy('sort_order').toArray(), []);
  const folders = useLiveQuery(() => db.folders.toArray(), []);

  const collectionList = collections ?? [];
  const foldersInCollection = selectedCollectionId
    ? (folders ?? []).filter(f => f.collection_id === selectedCollectionId)
    : [];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(draftName ?? 'New Request');
      setSelectedCollectionId(prefillCollectionId ?? null);
      setSelectedFolderId(prefillFolderId ?? null);
      setSaving(false);
      // Auto-focus name input
      setTimeout(() => nameInputRef.current?.select(), 50);
    }
  }, [open, draftName, prefillCollectionId, prefillFolderId]);

  const handleSave = async () => {
    if (!draftTabId || !selectedCollectionId) return;
    setSaving(true);
    try {
      await onSave(draftTabId, name.trim() || 'New Request', selectedCollectionId, selectedFolderId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-lg">
          <Dialog.Title className="text-sm font-medium">Save request</Dialog.Title>
          <p className="mt-1 text-xs text-gray-500">Save this request to a collection.</p>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-gray-400">Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && selectedCollectionId) void handleSave(); }}
              className="w-full rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              placeholder="Request name"
            />
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
            {selectedCollectionId && foldersInCollection.length > 0 && (
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
              onClick={handleSave}
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
