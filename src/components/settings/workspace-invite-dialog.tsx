/**
 * Dialog for inviting a member to a workspace by email + role.
 */

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { toast } from '../common/toast-provider';

const ROLES = ['viewer', 'editor', 'admin'];

interface WorkspaceInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function WorkspaceInviteDialog({ open, onOpenChange, workspaceId }: WorkspaceInviteDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const inviteMember = useWorkspaceStore(s => s.inviteMember);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await inviteMember(workspaceId, email.trim(), role);
      toast('Invitation sent', { description: `Invited ${email} as ${role}`, variant: 'success' });
      setEmail('');
      onOpenChange(false);
    } catch (err) {
      toast('Invite failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-4 shadow-xl z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-slate-200">Invite Member</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded p-1 text-slate-500 hover:text-slate-200 hover:bg-[var(--color-bg-tertiary)]">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Email address</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                autoFocus
                className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[var(--color-accent)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Role</span>
              <Select.Root value={role} onValueChange={setRole}>
                <Select.Trigger className="flex items-center justify-between rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-slate-200 focus:border-[var(--color-accent)] focus:outline-none">
                  <Select.Value />
                  <Select.Icon><ChevronDown className="h-3.5 w-3.5 text-slate-500" /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] py-1 shadow-xl z-50">
                    <Select.Viewport>
                      {ROLES.map(r => (
                        <Select.Item
                          key={r}
                          value={r}
                          className="px-3 py-1.5 text-sm capitalize text-slate-200 cursor-pointer hover:bg-[var(--color-bg-tertiary)] outline-none"
                        >
                          <Select.ItemText>{r}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex items-center gap-1.5 rounded bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send Invite
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
