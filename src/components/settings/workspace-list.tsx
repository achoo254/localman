/**
 * Workspace list component — renders workspace items with actions.
 * Owner can delete; non-owner can leave; anyone can view members.
 */

import { useState } from 'react';
import { Users, Trash2, LogOut, Settings } from 'lucide-react';
import type { WorkspaceInfo } from '../../stores/sync-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { WorkspaceMemberDialog } from './workspace-member-dialog';
import { toast } from '../common/toast-provider';

interface WorkspaceListProps {
  workspaces: WorkspaceInfo[];
  onRefresh: () => Promise<void>;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'owner': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'admin': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'editor': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

interface WorkspaceRowProps {
  workspace: WorkspaceInfo;
  onRefresh: () => Promise<void>;
}

function WorkspaceRow({ workspace, onRefresh }: WorkspaceRowProps) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const deleteWorkspace = useWorkspaceStore(s => s.deleteWorkspace);
  const leaveWorkspace = useWorkspaceStore(s => s.leaveWorkspace);

  const isOwner = workspace.role === 'owner';

  const handleDelete = async () => {
    if (!confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteWorkspace(workspace.id);
      toast('Workspace deleted', { variant: 'success' });
      await onRefresh();
    } catch (err) {
      toast('Failed to delete workspace', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(`Leave workspace "${workspace.name}"?`)) return;
    setBusy(true);
    try {
      await leaveWorkspace(workspace.id);
      toast('Left workspace', { variant: 'success' });
      await onRefresh();
    } catch (err) {
      toast('Failed to leave workspace', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{workspace.name}</p>
        </div>

        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${roleBadgeClass(workspace.role)}`}>
          {workspace.role}
        </span>

        <button
          type="button"
          onClick={() => setMembersOpen(true)}
          className="rounded p-1.5 text-slate-500 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200"
          title="Manage members"
          aria-label="Manage members"
        >
          <Users className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setMembersOpen(true)}
          className="rounded p-1.5 text-slate-500 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200"
          title="Workspace settings"
          aria-label="Workspace settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        {isOwner ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
            className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            title="Delete workspace"
            aria-label="Delete workspace"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleLeave()}
            disabled={busy}
            className="rounded p-1.5 text-slate-500 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200 disabled:opacity-50"
            title="Leave workspace"
            aria-label="Leave workspace"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <WorkspaceMemberDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        currentUserRole={workspace.role}
      />
    </>
  );
}

export function WorkspaceList({ workspaces, onRefresh }: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-2">
        No workspaces yet. Create one to collaborate with your team.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {workspaces.map(ws => (
        <WorkspaceRow key={ws.id} workspace={ws} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
