/**
 * Right-click context menu for collection, folder, and request nodes.
 * Includes "Toggle Cloud Sync", "Move to Workspace", and "Move to Personal" for collections.
 */

import * as ContextMenu from '@radix-ui/react-context-menu';
import { ChevronRight } from 'lucide-react';
import type { TreeNode } from '../../utils/tree-builder';
import type { WorkspaceInfo } from '../../stores/sync-store';

interface CollectionContextMenuProps {
  node: TreeNode;
  children: React.ReactNode;
  onNewRequest: (collectionId: string, folderId: string | null) => void;
  onNewFolder: (collectionId: string, parentId: string | null) => void;
  onRenameCollection: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onDuplicateRequest: (id: string) => void;
  onMoveRequest: (requestId: string) => void;
  onDeleteRequest: (id: string) => void;
  onExportCollection?: (collectionId: string, collectionName: string) => void;
  onCopyAsCurl?: (requestId: string) => void;
  onRenameRequest?: (id: string, name: string) => void;
  /** Called when user toggles cloud sync for a collection */
  onToggleSync?: (collectionId: string) => void;
  /** Available workspaces for "Move to Workspace" submenu */
  workspaces?: WorkspaceInfo[];
  /** Called when user moves a collection to a workspace (null = personal) */
  onMoveCollection?: (collectionId: string, workspaceId: string | null) => void;
  /** Current workspaceId of the collection node (undefined/null = personal) */
  collectionWorkspaceId?: string | null;
}

const menuItemClass = 'px-3 py-1.5 text-sm outline-none hover:bg-[var(--color-bg-tertiary)] cursor-pointer';
const menuItemDangerClass = `${menuItemClass} text-red-400`;

export function CollectionContextMenu({
  node,
  children,
  onNewRequest,
  onNewFolder,
  onRenameCollection,
  onRenameFolder,
  onDeleteCollection,
  onDeleteFolder,
  onDuplicateRequest,
  onMoveRequest,
  onDeleteRequest,
  onExportCollection,
  onCopyAsCurl,
  onRenameRequest,
  onToggleSync,
  workspaces,
  onMoveCollection,
  collectionWorkspaceId,
}: CollectionContextMenuProps) {
  const hasWorkspaces = workspaces && workspaces.length > 0;
  const showMoveActions = node.type === 'collection' && onMoveCollection && hasWorkspaces;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-[180px] rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] py-1 shadow-lg z-50"
          onCloseAutoFocus={e => e.preventDefault()}
        >
          {node.type === 'collection' && (
            <>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onNewRequest(node.id, null)}
              >
                New Request
              </ContextMenu.Item>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onNewFolder(node.id, null)}
              >
                New Folder
              </ContextMenu.Item>
              <ContextMenu.Separator className="h-px bg-[var(--color-bg-tertiary)] my-1" />
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onRenameCollection(node.id, node.name)}
              >
                Rename
              </ContextMenu.Item>
              {onExportCollection && (
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => onExportCollection(node.id, node.name)}
                >
                  Export
                </ContextMenu.Item>
              )}
              {onToggleSync && (
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => onToggleSync(node.id)}
                >
                  Toggle Cloud Sync
                </ContextMenu.Item>
              )}
              {/* Move to workspace submenu */}
              {showMoveActions && (
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger className={`${menuItemClass} flex items-center justify-between`}>
                    Move to…
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  </ContextMenu.SubTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.SubContent
                      className="min-w-[160px] rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] py-1 shadow-lg z-50"
                    >
                      {/* Personal option — only if currently in a workspace */}
                      {collectionWorkspaceId && (
                        <ContextMenu.Item
                          className={menuItemClass}
                          onSelect={() => onMoveCollection!(node.id, null)}
                        >
                          Personal
                        </ContextMenu.Item>
                      )}
                      {workspaces!.map(ws => (
                        <ContextMenu.Item
                          key={ws.id}
                          className={`${menuItemClass} ${ws.id === collectionWorkspaceId ? 'opacity-40 pointer-events-none' : ''}`}
                          onSelect={() => onMoveCollection!(node.id, ws.id)}
                        >
                          {ws.name}
                        </ContextMenu.Item>
                      ))}
                    </ContextMenu.SubContent>
                  </ContextMenu.Portal>
                </ContextMenu.Sub>
              )}
              <ContextMenu.Separator className="h-px bg-[var(--color-bg-tertiary)] my-1" />
              <ContextMenu.Item
                className={menuItemDangerClass}
                onSelect={() => onDeleteCollection(node.id)}
              >
                Delete
              </ContextMenu.Item>
            </>
          )}
          {node.type === 'folder' && (
            <>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onNewRequest(node.collectionId, node.id)}
              >
                New Request
              </ContextMenu.Item>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onNewFolder(node.collectionId, node.id)}
              >
                New Sub-folder
              </ContextMenu.Item>
              <ContextMenu.Separator className="h-px bg-[var(--color-bg-tertiary)] my-1" />
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onRenameFolder(node.id, node.name)}
              >
                Rename
              </ContextMenu.Item>
              <ContextMenu.Item
                className={menuItemDangerClass}
                onSelect={() => onDeleteFolder(node.id)}
              >
                Delete
              </ContextMenu.Item>
            </>
          )}
          {node.type === 'request' && (
            <>
              {onCopyAsCurl && (
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => onCopyAsCurl(node.id)}
                >
                  Copy as cURL
                </ContextMenu.Item>
              )}
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onDuplicateRequest(node.id)}
              >
                Duplicate
              </ContextMenu.Item>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onMoveRequest(node.id)}
              >
                Move
              </ContextMenu.Item>
              {onRenameRequest && (
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => onRenameRequest(node.id, node.name)}
                >
                  Rename
                </ContextMenu.Item>
              )}
              <ContextMenu.Separator className="h-px bg-[var(--color-bg-tertiary)] my-1" />
              <ContextMenu.Item
                className={menuItemDangerClass}
                onSelect={() => onDeleteRequest(node.id)}
              >
                Delete
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
