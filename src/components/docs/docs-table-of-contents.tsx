/**
 * Table of contents sidebar for docs viewer.
 * Shows collection → folder → request hierarchy with anchor links.
 */

import type { TreeNode } from '../../utils/tree-builder';
import { METHOD_TEXT_CLASSES } from '../../utils/method-colors';

interface DocsTableOfContentsProps {
  tree: TreeNode[];
  selectedCollectionId: string | null;
}

export function DocsTableOfContents({ tree, selectedCollectionId }: DocsTableOfContentsProps) {
  const selectedTree = tree.find(n => n.id === selectedCollectionId);
  if (!selectedTree) return null;

  return (
    <nav className="text-xs overflow-auto custom-scrollbar">
      <h3 className="font-semibold text-slate-300 mb-2 truncate">{selectedTree.name}</h3>
      <TocChildren nodes={selectedTree.children} depth={0} />
    </nav>
  );
}

function TocChildren({ nodes, depth }: { nodes: TreeNode[]; depth: number }) {
  return (
    <ul className="space-y-0.5" style={{ paddingLeft: depth > 0 ? 10 : 0 }}>
      {nodes.map(node => (
        <li key={node.id}>
          {node.type === 'request' ? (
            <a
              href={`#req-${node.id}`}
              className="flex items-center gap-1.5 py-0.5 px-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors truncate"
              onClick={e => {
                e.preventDefault();
                document.getElementById(`req-${node.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {node.method && (
                <span className={`text-[10px] font-bold shrink-0 ${METHOD_TEXT_CLASSES[node.method] ?? 'text-slate-500'}`}>
                  {node.method.slice(0, 3)}
                </span>
              )}
              <span className="truncate">{node.name}</span>
            </a>
          ) : (
            <>
              <span className="block py-0.5 px-1.5 font-medium text-slate-400 truncate">
                {node.name}
              </span>
              {node.children.length > 0 && <TocChildren nodes={node.children} depth={depth + 1} />}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
