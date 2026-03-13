/**
 * Sectioned collections view: Personal section + one Team section per workspace.
 * Replaces the flat list in the collections tab. Search filters across all sections.
 */

import { useState, useMemo } from 'react';
import { Folder } from 'lucide-react';
import { CollectionSectionHeader } from './collection-section-header';
import { CollectionTree, type ContextMenuCallbacks } from './collection-tree';
import { buildTree } from '../../utils/tree-builder';
import { useLiveQuery } from '../../hooks/use-live-query';
import { db } from '../../db/database';
import { useCollectionsStore } from '../../stores/collections-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useSyncStore } from '../../stores/sync-store';

interface CollectionsTabSectionsProps {
  activeRequestId: string | null;
  onOpenRequest: (requestId: string) => void;
  contextMenuCallbacks: ContextMenuCallbacks;
  onCreateCollection: (workspaceId?: string | null) => void;
}

export function CollectionsTabSections({
  activeRequestId,
  onOpenRequest,
  contextMenuCallbacks,
  onCreateCollection,
}: CollectionsTabSectionsProps) {
  const [personalCollapsed, setPersonalCollapsed] = useState(false);
  const [wsCollapsed, setWsCollapsed] = useState<Record<string, boolean>>({});

  const collections = useLiveQuery(() => db.collections.orderBy('sort_order').toArray(), []);
  const folders = useLiveQuery(() => db.folders.toArray(), []);
  const requests = useLiveQuery(() => db.requests.toArray(), []);
  const searchQuery = useCollectionsStore(s => s.searchQuery);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const userEmail = useSyncStore(s => s.config.userEmail);
  const isAuthenticated = !!userEmail;

  const { personalTree, workspaceTrees } = useMemo(() => {
    const c = collections ?? [];
    const f = folders ?? [];
    const r = requests ?? [];

    const personalCollections = c.filter(col => !col.workspace_id);
    const pTree = buildTree(personalCollections, f, r, searchQuery);

    const wsTrees: Record<string, ReturnType<typeof buildTree>> = {};
    for (const ws of workspaces) {
      const wsCollections = c.filter(col => col.workspace_id === ws.id);
      wsTrees[ws.id] = buildTree(wsCollections, f, r, searchQuery);
    }

    return { personalTree: pTree, workspaceTrees: wsTrees };
  }, [collections, folders, requests, searchQuery, workspaces]);

  const isLoading = collections === undefined;

  if (isLoading) {
    return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  }

  const handleToggleWs = (wsId: string) => {
    setWsCollapsed(prev => ({ ...prev, [wsId]: !prev[wsId] }));
  };

  const hasAnyCollections =
    personalTree.length > 0 || workspaces.some(ws => (workspaceTrees[ws.id]?.length ?? 0) > 0);

  // Empty state — no collections at all and no search active
  if (!hasAnyCollections && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-4 text-center mt-10">
        <div className="p-3 bg-slate-800/50 rounded-full">
          <Folder className="h-6 w-6 text-slate-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-300">No collections yet</h3>
          <p className="text-xs text-slate-500 mt-1">Create a collection to organize requests</p>
        </div>
        <button
          type="button"
          onClick={() => onCreateCollection(null)}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-md active:scale-95"
        >
          New collection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-2">
      {/* Personal section */}
      <CollectionSectionHeader
        title="Personal"
        isCollapsed={personalCollapsed}
        onToggle={() => setPersonalCollapsed(p => !p)}
        onCreateCollection={() => onCreateCollection(null)}
      />
      {!personalCollapsed && (
        personalTree.length > 0 ? (
          <CollectionTree
            tree={personalTree}
            onOpenRequest={onOpenRequest}
            activeRequestId={activeRequestId}
            contextMenuCallbacks={contextMenuCallbacks}
          />
        ) : (
          <p className="px-4 py-1 text-xs text-slate-600 italic">No personal collections</p>
        )
      )}

      {/* Team workspace sections — only visible when authenticated */}
      {isAuthenticated && workspaces.map(ws => (
        <div key={ws.id} className="mt-1">
          <CollectionSectionHeader
            title={ws.name}
            isCollapsed={!!wsCollapsed[ws.id]}
            onToggle={() => handleToggleWs(ws.id)}
            onCreateCollection={() => onCreateCollection(ws.id)}
          />
          {!wsCollapsed[ws.id] && (
            (workspaceTrees[ws.id]?.length ?? 0) > 0 ? (
              <CollectionTree
                tree={workspaceTrees[ws.id] ?? []}
                onOpenRequest={onOpenRequest}
                activeRequestId={activeRequestId}
                contextMenuCallbacks={contextMenuCallbacks}
              />
            ) : (
              <p className="px-4 py-1 text-xs text-slate-600 italic">No team collections</p>
            )
          )}
        </div>
      ))}

      {/* Bottom create button */}
      <div className="px-3 mt-4">
        <button
          type="button"
          onClick={() => onCreateCollection(null)}
          className="w-full rounded-lg border border-dashed border-slate-700/60 py-2.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-200 hover:border-slate-500 hover:bg-white/[0.02]"
        >
          + New collection
        </button>
      </div>
    </div>
  );
}
