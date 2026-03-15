/**
 * Workspace switcher dropdown in the sidebar header.
 * Lets users switch between Personal and team workspaces.
 */

import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Plus, Link, Check } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useSyncStore } from '../../stores/sync-store';
import { NameInputDialog } from '../common/name-input-dialog';

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    owner: 'text-yellow-400',
    admin: 'text-blue-400',
    editor: 'text-green-400',
    viewer: 'text-slate-400',
  };
  return (
    <span className={`text-[10px] font-medium uppercase ${colors[role] ?? 'text-slate-400'}`}>
      {role}
    </span>
  );
}

export function WorkspaceSwitcher() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
  const loadWorkspaces = useWorkspaceStore(s => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace);
  const loadActiveWorkspaceId = useWorkspaceStore(s => s.loadActiveWorkspaceId);
  const isAuthenticated = useSyncStore(s => s.isAuthenticated());

  useEffect(() => {
    void loadActiveWorkspaceId();
    if (isAuthenticated) void loadWorkspaces();
  }, [loadActiveWorkspaceId, loadWorkspaces, isAuthenticated]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const displayName = activeWorkspaceId === null ? 'Personal' : (activeWorkspace?.name ?? 'Workspace');

  return (
    <>
      <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-sm text-slate-200 hover:bg-[var(--color-bg-tertiary)] transition-colors truncate"
            aria-label="Switch workspace"
          >
            <span className="truncate flex-1 text-left font-medium">{displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[200px] rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] py-1 shadow-xl z-50"
            sideOffset={4}
            align="start"
          >
            {/* Personal option */}
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--color-bg-tertiary)] outline-none"
              onSelect={() => void setActiveWorkspace(null)}
            >
              {activeWorkspaceId === null && <Check className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />}
              <span className={activeWorkspaceId !== null ? 'pl-5' : ''}>Personal</span>
            </DropdownMenu.Item>

            {workspaces.length > 0 && (
              <>
                <DropdownMenu.Separator className="h-px bg-[var(--color-bg-tertiary)] my-1" />
                {workspaces.map(ws => (
                  <DropdownMenu.Item
                    key={ws.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--color-bg-tertiary)] outline-none"
                    onSelect={() => void setActiveWorkspace(ws.id)}
                  >
                    {activeWorkspaceId === ws.id
                      ? <Check className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                      : <span className="w-3.5 shrink-0" />
                    }
                    <span className="flex-1 truncate">{ws.name}</span>
                    {roleBadge(ws.role)}
                  </DropdownMenu.Item>
                ))}
              </>
            )}

            {isAuthenticated && (
              <>
                <DropdownMenu.Separator className="h-px bg-[var(--color-bg-tertiary)] my-1" />
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200 outline-none"
                  onSelect={() => { setDropdownOpen(false); setCreateOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Workspace
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer text-slate-400 hover:bg-[var(--color-bg-tertiary)] hover:text-slate-200 outline-none"
                  onSelect={() => { setDropdownOpen(false); setJoinOpen(true); }}
                >
                  <Link className="h-3.5 w-3.5" />
                  Join Workspace
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Create workspace dialog */}
      <NameInputDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Workspace"
        placeholder="Workspace name"
        confirmLabel="Create"
        onConfirm={async name => {
          await createWorkspace(name);
        }}
      />

      {/* Join workspace — placeholder (requires invite link flow, not in scope) */}
      <NameInputDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        title="Join Workspace"
        placeholder="Invite code or workspace ID"
        confirmLabel="Join"
        onConfirm={async () => {
          // TODO: implement join via invite code when backend supports it
        }}
      />
    </>
  );
}
