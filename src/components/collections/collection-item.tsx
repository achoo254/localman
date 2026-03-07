/**
 * Collection node: icon, name, request count, expand toggle.
 */

import { ChevronRight, Folder } from 'lucide-react';
import type { TreeNode } from '../../utils/tree-builder';
import type { ContextMenuCallbacks } from './collection-tree';
import { CollectionContextMenu } from './collection-context-menu';
import { FolderItem } from './folder-item';
import { RequestItem } from './request-item';

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
        onClick={e => e.stopPropagation()}
      >
        <ChevronRight
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>
      <Folder className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
      <span className="truncate text-sm flex-1">{node.name}</span>
      {node.requestCount != null && node.requestCount > 0 && (
        <span className="text-xs text-gray-500 shrink-0">{node.requestCount}</span>
      )}
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
