/**
 * Folder node: folder icon, name, expand toggle, nested children.
 */

import { ChevronRight, FolderOpen } from 'lucide-react';
import type { TreeNode } from '../../utils/tree-builder';
import type { ContextMenuCallbacks } from './collection-tree';
import { useCollectionsStore } from '../../stores/collections-store';
import { CollectionContextMenu } from './collection-context-menu';
import { FolderItem as NestedFolderItem } from './folder-item';
import { RequestItem } from './request-item';

interface FolderItemProps {
  node: TreeNode;
  depth: number;
  onOpenRequest: (requestId: string) => void;
  activeRequestId: string | null;
  contextMenuCallbacks: ContextMenuCallbacks;
}

export function FolderItem({
  node,
  depth,
  onOpenRequest,
  activeRequestId,
  contextMenuCallbacks,
}: FolderItemProps) {
  const expandedIds = useCollectionsStore(s => s.expandedIds);
  const toggleExpand = useCollectionsStore(s => s.toggleExpand);
  const isExpanded = expandedIds.has(node.id);

  const row = (
    <div
      className="flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-[var(--color-bg-tertiary)] min-h-8"
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={() => toggleExpand(node.id)}
    >
      <button
        type="button"
        className="shrink-0 p-0.5 rounded"
        aria-expanded={isExpanded}
        onClick={e => { e.stopPropagation(); toggleExpand(node.id); }}
      >
        <ChevronRight
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>
      <FolderOpen className="h-4 w-4 shrink-0 text-gray-500" />
      <span className="truncate text-sm flex-1 min-w-0" title={node.name}>{node.name}</span>
    </div>
  );

  return (
    <div className="flex flex-col">
      <CollectionContextMenu node={node} {...contextMenuCallbacks}>
        {row}
      </CollectionContextMenu>
      {isExpanded &&
        node.children.map(child =>
          child.type === 'folder' ? (
            <NestedFolderItem
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
