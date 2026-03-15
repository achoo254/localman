/**
 * Full docs viewer: collection selector, TOC sidebar, request cards, export buttons.
 * Rendered inside the sidebar content area when "Docs" tab is active.
 */

import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, Download, FileText, FileCode } from 'lucide-react';
import { useCollectionTree } from '../../hooks/use-collection-tree';
import { useLiveQuery } from '../../hooks/use-live-query';
import { db } from '../../db/database';
import { DocsRequestCard } from './docs-request-card';
import { DocsTableOfContents } from './docs-table-of-contents';
import { exportCollectionAsHtml, exportCollectionAsMarkdown } from '../../services/docs-export-service';
import { toast } from '../common/toast-provider';
import type { ApiRequest } from '../../types/models';

function isTauri(): boolean {
  return !!(window as unknown as Record<string, unknown>).__TAURI__;
}

export function DocsViewerPage() {
  const { tree } = useCollectionTree();
  const collections = useLiveQuery(() => db.collections.orderBy('sort_order').toArray(), []);
  const allFolders = useLiveQuery(() => db.folders.toArray(), []);
  const allRequests = useLiveQuery(() => db.requests.toArray(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first collection if none selected
  const effectiveId = selectedId ?? collections?.[0]?.id ?? null;

  const selectedCollection = useMemo(
    () => collections?.find(c => c.id === effectiveId),
    [collections, effectiveId],
  );

  const collectionRequests = useMemo(
    () => (allRequests ?? []).filter(r => r.collection_id === effectiveId),
    [allRequests, effectiveId],
  );

  const collectionFolders = useMemo(
    () => (allFolders ?? []).filter(f => f.collection_id === effectiveId),
    [allFolders, effectiveId],
  );

  // Group requests: root-level + by folder
  const rootRequests = useMemo(
    () => collectionRequests.filter(r => !r.folder_id).sort((a, b) => a.sort_order - b.sort_order),
    [collectionRequests],
  );

  const requestsByFolder = useMemo(() => {
    const map = new Map<string, ApiRequest[]>();
    for (const r of collectionRequests) {
      if (!r.folder_id) continue;
      const arr = map.get(r.folder_id) ?? [];
      arr.push(r);
      map.set(r.folder_id, arr);
    }
    // Sort each group
    for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [collectionRequests]);

  const handleExport = useCallback(async (format: 'html' | 'markdown') => {
    if (!selectedCollection) return;
    const col = selectedCollection;
    const folders = collectionFolders;
    const requests = collectionRequests;

    const content = format === 'html'
      ? exportCollectionAsHtml(col, folders, requests)
      : exportCollectionAsMarkdown(col, folders, requests);

    const ext = format === 'html' ? 'html' : 'md';
    const filename = `${col.name.replace(/[^a-zA-Z0-9]/g, '-')}-api-docs.${ext}`;

    if (isTauri()) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const path = await save({ defaultPath: filename });
        if (path) {
          await writeTextFile(path, content);
          toast(`Exported ${filename}`);
        }
      } catch (err) {
        toast('Export failed', { description: String(err), variant: 'error' });
      }
    } else {
      // Browser fallback: download via blob
      const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Downloaded ${filename}`);
    }
  }, [selectedCollection, collectionFolders, collectionRequests]);

  if (!collections?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 mt-10">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No collections to document.</p>
        <p className="text-xs mt-1">Create a collection first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Collection selector + Export */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--color-bg-tertiary)]">
        <div className="relative flex-1 min-w-0">
          <select
            value={effectiveId ?? ''}
            onChange={e => setSelectedId(e.target.value)}
            className="appearance-none w-full bg-[var(--color-bg-tertiary)] text-xs text-slate-300 rounded-md pl-2.5 pr-6 py-1.5 border border-transparent hover:border-slate-600 focus:border-[var(--color-accent)] focus:outline-none cursor-pointer truncate"
          >
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Export buttons */}
        <button
          type="button"
          onClick={() => handleExport('html')}
          className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title="Export as HTML"
        >
          <FileCode className="h-3.5 w-3.5" />
          HTML
        </button>
        <button
          type="button"
          onClick={() => handleExport('markdown')}
          className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title="Export as Markdown"
        >
          <Download className="h-3.5 w-3.5" />
          MD
        </button>
      </div>

      {/* Content: TOC + Request cards */}
      <div className="flex-1 min-h-0 flex">
        {/* TOC */}
        <div className="w-[140px] shrink-0 border-r border-[var(--color-bg-tertiary)] p-2 overflow-auto custom-scrollbar">
          <DocsTableOfContents tree={tree} selectedCollectionId={effectiveId} />
        </div>

        {/* Request cards */}
        <div className="flex-1 overflow-auto custom-scrollbar p-3">
          {selectedCollection?.description && (
            <p className="text-xs text-slate-400 mb-3">{selectedCollection.description}</p>
          )}

          {rootRequests.map(req => (
            <DocsRequestCard key={req.id} request={req} />
          ))}

          {[...collectionFolders].sort((a, b) => a.sort_order - b.sort_order).map(folder => {
            const folderReqs = requestsByFolder.get(folder.id) ?? [];
            if (folderReqs.length === 0) return null;
            return (
              <div key={folder.id} className="mb-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  {folder.name}
                </h3>
                {folderReqs.map(req => (
                  <DocsRequestCard key={req.id} request={req} />
                ))}
              </div>
            );
          })}

          {collectionRequests.length === 0 && (
            <p className="text-xs text-slate-500 text-center mt-8">No requests in this collection.</p>
          )}
        </div>
      </div>
    </div>
  );
}
