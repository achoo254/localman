/**
 * Collection node: icon, name, request count, expand toggle.
 * Shows cloud icon (☁) next to synced collections.
 */

import { ChevronRight, Folder, Cloud } from 'lucide-react';
import type { TreeNode } from '../../utils/tree-builder';
import type { ContextMenuCallbacks } from './collection-tree';
import { CollectionContextMenu } from './collection-context-menu';
import { FolderItem } from './folder-item';
import { RequestItem } from './request-item';
import { useLiveQuery } from '../../hooks/use-live-query';
import { db } from '../../db/database';

interface CollectionItemProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenRequest: (requestId: string) => void;
  activeRequestId: string | null;
  contextMenuCallbacks: ContextMenuCallbacks;
}

export function CollectionItem({
  node,
  depth,
  isExpanded,
  onToggle,
  onOpenRequest,
  activeRequestId,
  contextMenuCallbacks,
}: CollectionItemProps) {
  // Live query to get is_synced and workspace_id for collection nodes only
  const collectionRecord = useLiveQuery<{ is_synced?: boolean; workspace_id?: string | null } | undefined>(
    () => node.type === 'collection'
      ? db.collections.get(node.id).then(c => c ? { is_synced: c.is_synced, workspace_id: c.workspace_id } : undefined)
      : Promise.resolve(undefined),
    [node.id, node.type]
  );
  const isSynced = collectionRecord?.is_synced === true;
  const collectionWorkspaceId = collectionRecord?.workspace_id ?? null;

  const row = (
    <div
      className="flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-[var(--color-bg-tertiary)] min-h-8"
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={onToggle}
    >
      <button
        type="button"
        className="shrink-0 p-0.5 rounded hover:bg-[var(--color-bg-tertiary)]"
        aria-expanded={isExpanded}
        onClick={e => { e.stopPropagation(); onToggle(); }}
      >
        <ChevronRight
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>
      <Folder className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
      <span className="truncate text-sm flex-1 min-w-0" title={node.name}>{node.name}</span>
      {isSynced && (
        <Cloud className="h-3 w-3 shrink-0 text-[var(--color-accent)] opacity-70" aria-label="Cloud sync enabled" />
      )}
      {node.requestCount != null && node.requestCount > 0 && (
        <span className="text-xs text-gray-500 shrink-0" title={`${node.requestCount} request${node.requestCount !== 1 ? 's' : ''}`}>{node.requestCount}</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      <CollectionContextMenu
        node={node}
        {...contextMenuCallbacks}
        collectionWorkspaceId={collectionWorkspaceId}
      >
        {row}
      </CollectionContextMenu>
      {isExpanded &&
        node.children.map(child =>
          child.type === 'folder' ? (
            <FolderItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onOpenRequest={onOpenRequest}
              activeRequestId={activeRequestId}
              contextMenuCallbacks={contextMenuCallbacks}
            />
          ) : (
            <RequestItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onOpenRequest={onOpenRequest}
              isActive={activeRequestId === child.id}
              contextMenuCallbacks={contextMenuCallbacks}
            />
          )
        )}
    </div>
  );
}
