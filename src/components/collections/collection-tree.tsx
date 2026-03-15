/**
 * Recursive collection tree: collections -> folders -> requests.
 * Passes workspace filtering and is_synced icon state to collection items.
 */

import type { TreeNode } from '../../utils/tree-builder';
import { useCollectionsStore } from '../../stores/collections-store';
import { CollectionItem } from './collection-item';
import type { WorkspaceInfo } from '../../stores/sync-store';

export interface ContextMenuCallbacks {
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
  onToggleSync?: (collectionId: string) => void;
  /** Workspace list for "Move to…" submenu on collections */
  workspaces?: WorkspaceInfo[];
  /** Called when user moves a collection to a workspace (null = personal) */
  onMoveCollection?: (collectionId: string, workspaceId: string | null) => void;
}

interface CollectionTreeProps {
  tree: TreeNode[];
  onOpenRequest: (requestId: string) => void;
  activeRequestId: string | null;
  contextMenuCallbacks: ContextMenuCallbacks;
}

export function CollectionTree({ tree, onOpenRequest, activeRequestId, contextMenuCallbacks }: CollectionTreeProps) {
  const expandedIds = useCollectionsStore(s => s.expandedIds);
  const toggleExpand = useCollectionsStore(s => s.toggleExpand);

  return (
    <div className="flex flex-col py-1">
      {tree.map(node => (
        <CollectionItem
          key={node.id}
          node={node}
          depth={0}
          isExpanded={expandedIds.has(node.id)}
          onToggle={() => toggleExpand(node.id)}
          onOpenRequest={onOpenRequest}
          activeRequestId={activeRequestId}
          contextMenuCallbacks={contextMenuCallbacks}
        />
      ))}
    </div>
  );
}
