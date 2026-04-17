/**
 * Right-click context menu for collection, folder, and request nodes.
 */

import * as ContextMenu from '@radix-ui/react-context-menu';
import type { TreeNode } from '../../utils/tree-builder';

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
}: CollectionContextMenuProps) {

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
