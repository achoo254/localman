/**
 * Dialog listing workspace members with role management and invite button.
 * Owner can change roles and remove members.
 */

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { X, ChevronDown, Loader2, UserPlus } from 'lucide-react';
import { useWorkspaceStore, type WorkspaceMember } from '../../stores/workspace-store';
import { WorkspaceInviteDialog } from './workspace-invite-dialog';
import { toast } from '../common/toast-provider';

const ROLES = ['viewer', 'editor', 'admin', 'owner'];

interface WorkspaceMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  currentUserRole: string;
}

export function WorkspaceMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  currentUserRole,
}: WorkspaceMemberDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const listMembers = useWorkspaceStore(s => s.listMembers);
  const updateMemberRole = useWorkspaceStore(s => s.updateMemberRole);
  const removeMember = useWorkspaceStore(s => s.removeMember);

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const list = await listMembers(workspaceId);
      setMembers(list);
    } catch (err) {
      toast('Failed to load members', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void fetchMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaceId]);

  const handleRoleChange = async (member: WorkspaceMember, newRole: string) => {
    try {
      await updateMemberRole(workspaceId, member.id, newRole);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
    } catch (err) {
      toast('Failed to update role', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  };

  const handleRemove = async (member: WorkspaceMember) => {
    try {
      await removeMember(workspaceId, member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      toast('Member removed', { variant: 'success' });
    } catch (err) {
      toast('Failed to remove member', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] shadow-xl z-50 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-tertiary)] shrink-0">
              <Dialog.Title className="text-sm font-semibold text-slate-200">
                {workspaceName} — Members
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded p-1 text-slate-500 hover:text-slate-200 hover:bg-[var(--color-bg-tertiary)]">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Members list */}
            <div className="flex-1 overflow-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                </div>
              ) : members.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No members found.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-bg-tertiary)]">
                  {members.map(member => (
                    <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{member.name || member.email}</p>
                        {member.name && (
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        )}
                      </div>
                      {isOwnerOrAdmin ? (
                        <Select.Root
                          value={member.role}
                          onValueChange={val => void handleRoleChange(member, val)}
                        >
                          <Select.Trigger className="flex items-center gap-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-slate-300 hover:border-slate-500 focus:outline-none">
                            <Select.Value />
                            <Select.Icon><ChevronDown className="h-3 w-3 text-slate-500" /></Select.Icon>
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] py-1 shadow-xl z-50">
                              <Select.Viewport>
                                {ROLES.map(r => (
                                  <Select.Item
                                    key={r}
                                    value={r}
                                    className="px-3 py-1.5 text-xs capitalize text-slate-200 cursor-pointer hover:bg-[var(--color-bg-tertiary)] outline-none"
                                  >
                                    <Select.ItemText>{r}</Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      ) : (
                        <span className="text-xs capitalize text-slate-400">{member.role}</span>
                      )}
                      {isOwnerOrAdmin && member.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => void handleRemove(member)}
                          className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer — invite button */}
            {isOwnerOrAdmin && (
              <div className="px-4 py-3 border-t border-[var(--color-bg-tertiary)] shrink-0">
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Member
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <WorkspaceInviteDialog
        open={inviteOpen}
        onOpenChange={open => {
          setInviteOpen(open);
          if (!open) void fetchMembers();
        }}
        workspaceId={workspaceId}
      />
    </>
  );
}
