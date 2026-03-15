/**
 * Create or rename folder — thin wrapper around NameInputDialog.
 */

import { NameInputDialog } from '../common/name-input-dialog';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  mode: 'create' | 'rename';
  onConfirm: (name: string) => Promise<void>;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  initialName = '',
  mode,
  onConfirm,
}: CreateFolderDialogProps) {
  return (
    <NameInputDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'New folder' : 'Rename folder'}
      placeholder="Folder name"
      initialName={initialName}
      confirmLabel={mode === 'create' ? 'Create' : 'Save'}
      onConfirm={onConfirm}
    />
  );
}
