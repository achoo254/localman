/**
 * Request node: method badge (colored), name, click to open.
 */

import type { TreeNode } from '../../utils/tree-builder';
import type { ContextMenuCallbacks } from './collection-tree';
import { CollectionContextMenu } from './collection-context-menu';
import { METHOD_COLORS } from '../../utils/method-colors';

interface RequestItemProps {
  node: TreeNode;
  depth: number;
  onOpenRequest: (requestId: string) => void;
  isActive: boolean;
  contextMenuCallbacks: ContextMenuCallbacks;
}

export function RequestItem({ node, depth, onOpenRequest, isActive, contextMenuCallbacks }: RequestItemProps) {
  const color = (node.method && METHOD_COLORS[node.method]) ?? 'var(--foreground)';

  const row = (
    <div
      className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer min-h-8 ${
        isActive ? 'bg-[var(--color-bg-tertiary)]' : 'hover:bg-[var(--color-bg-tertiary)]'
      }`}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={() => onOpenRequest(node.id)}
    >
      <span
        className="shrink-0 w-12 text-xs font-medium rounded px-1.5 py-0.5 text-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {node.method ?? 'GET'}
      </span>
      <span className="truncate text-sm flex-1 min-w-0" title={node.name}>{node.name}</span>
    </div>
  );

  return (
    <CollectionContextMenu node={node} {...contextMenuCallbacks}>
      {row}
    </CollectionContextMenu>
  );
}
