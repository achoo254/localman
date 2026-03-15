/**
 * Create or rename collection — thin wrapper around NameInputDialog.
 */

import { NameInputDialog } from '../common/name-input-dialog';

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  mode: 'create' | 'rename';
  onConfirm: (name: string) => Promise<void>;
}

export function CreateCollectionDialog({
  open,
  onOpenChange,
  initialName = '',
  mode,
  onConfirm,
}: CreateCollectionDialogProps) {
  return (
    <NameInputDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'New collection' : 'Rename collection'}
      placeholder="Collection name"
      initialName={initialName}
      confirmLabel={mode === 'create' ? 'Create' : 'Save'}
      onConfirm={onConfirm}
    />
  );
}
