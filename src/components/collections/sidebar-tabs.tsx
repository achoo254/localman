/**
 * Sidebar tabs: Collections (sectioned by workspace), History, Environments, Docs.
 */

import { useState, useMemo, useCallback } from 'react';
import { confirm } from '@tauri-apps/plugin-dialog';
import { Folder, History, Layers, BookOpen } from 'lucide-react';
import { CollectionSearch } from './collection-search';
import { CollectionsTabSections } from './collections-tab-sections';
import * as requestService from '../../db/services/request-service';
import { CreateCollectionDialog } from './create-collection-dialog';
import { CreateFolderDialog } from './create-folder-dialog';
import { MoveRequestDialog } from './move-request-dialog';
import { NameInputDialog } from '../common/name-input-dialog';
import { toast } from '../common/toast-provider';
import { ExportDialog } from '../import-export/export-dialog';
import { EnvironmentSidebarTab } from '../environments/environment-sidebar-tab';
import { HistorySidebarTab } from '../history/history-sidebar-tab';
import { DocsViewerPage } from '../docs/docs-viewer-page';
import { getCurlForRequest } from '../../services/import-export-service';
import { useEnvironmentStore } from '../../stores/environment-store';
import { useRequestStore } from '../../stores/request-store';
import { useCollectionsStore } from '../../stores/collections-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { db } from '../../db/database';

type TabId = 'collections' | 'history' | 'environments' | 'docs';

interface SidebarTabsProps {
  onOpenEnvironmentManager?: () => void;
}

export function SidebarTabs({ onOpenEnvironmentManager }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('collections');

  // Collection dialog state
  const [collectionDialog, setCollectionDialog] = useState<'create' | 'rename' | null>(null);
  const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null);
  const [renameCollectionName, setRenameCollectionName] = useState('');
  // workspaceId context for "create collection" triggered from a section header
  const [pendingCollectionWorkspaceId, setPendingCollectionWorkspaceId] = useState<string | null>(null);

  // Folder dialog state
  const [folderDialog, setFolderDialog] = useState<'create' | 'rename' | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [newFolderContext, setNewFolderContext] = useState<{ collectionId: string; parentId: string | null } | null>(null);

  // Request dialog/action state
  const [moveRequestId, setMoveRequestId] = useState<string | null>(null);
  const [renameRequestId, setRenameRequestId] = useState<string | null>(null);
  const [renameRequestName, setRenameRequestName] = useState('');

  // Export state
  const [exportCollectionId, setExportCollectionId] = useState<string | null>(null);
  const [exportCollectionName, setExportCollectionName] = useState('');

  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);
  const activeRequestId = useRequestStore(s => s.activeRequest?.id ?? null);
  const openRequest = useRequestStore(s => s.openRequest);
  const createDraftTab = useRequestStore(s => s.createDraftTab);
  const createCollection = useCollectionsStore(s => s.createCollection);
  const createFolder = useCollectionsStore(s => s.createFolder);
  const renameCollection = useCollectionsStore(s => s.renameCollection);
  const renameFolder = useCollectionsStore(s => s.renameFolder);
  const renameRequest = useCollectionsStore(s => s.renameRequest);
  const setRequestName = useRequestStore(s => s.setRequestName);
  const deleteCollection = useCollectionsStore(s => s.deleteCollection);
  const deleteFolder = useCollectionsStore(s => s.deleteFolder);
  const duplicateRequest = useCollectionsStore(s => s.duplicateRequest);
  const deleteRequest = useCollectionsStore(s => s.deleteRequest);
  const moveRequestToCollection = useCollectionsStore(s => s.moveRequestToCollection);
  const moveCollectionToWorkspace = useCollectionsStore(s => s.moveCollectionToWorkspace);
  const workspaces = useWorkspaceStore(s => s.workspaces);

  const handleOpenRequest = async (requestId: string) => {
    const req = await requestService.getById(requestId);
    if (req) openRequest(req);
  };

  const handleNewRequest = (collectionId: string, folderId: string | null) => {
    createDraftTab(collectionId, folderId);
  };

  const handleNewFolder = (collectionId: string, parentId: string | null) => {
    setNewFolderContext({ collectionId, parentId });
    setFolderDialog('create');
  };

  const handleRenameCollection = (id: string, name: string) => {
    setRenameCollectionId(id);
    setRenameCollectionName(name);
    setCollectionDialog('rename');
  };

  const handleRenameFolder = (id: string, name: string) => {
    setRenameFolderId(id);
    setRenameFolderName(name);
    setFolderDialog('rename');
  };

  const handleDeleteCollection = useCallback(async (id: string) => {
    if (!await confirm('Delete this collection and all its folders and requests?')) return;
    await deleteCollection(id);
  }, [deleteCollection]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    if (await confirm('Delete this folder and its contents?')) {
      await deleteFolder(id);
    }
  }, [deleteFolder]);

  const handleDeleteRequest = useCallback(async (id: string) => {
    if (await confirm('Delete this request?')) {
      await deleteRequest(id);
    }
  }, [deleteRequest]);

  const handleDuplicateRequest = async (id: string) => {
    const copy = await duplicateRequest(id);
    if (copy) openRequest(copy);
  };

  const handleMoveRequest = (id: string) => setMoveRequestId(id);

  const handleRenameRequest = (id: string, name: string) => {
    setRenameRequestId(id);
    setRenameRequestName(name);
  };

  const handleMoveRequestConfirm = async (collectionId: string, folderId: string | null) => {
    if (!moveRequestId) return;
    await moveRequestToCollection(moveRequestId, collectionId, folderId);
    setMoveRequestId(null);
  };

  const handleExportCollection = (collectionId: string, collectionName: string) => {
    setExportCollectionId(collectionId);
    setExportCollectionName(collectionName);
  };

  const handleCopyAsCurl = async (requestId: string) => {
    const req = await requestService.getById(requestId);
    if (!req) return;
    const context = getInterpolationContext();
    const curl = getCurlForRequest(req, context);
    await navigator.clipboard.writeText(curl);
  };

  const handleToggleSync = useCallback(async (collectionId: string) => {
    const col = await db.collections.get(collectionId);
    if (!col) return;
    await db.collections.update(collectionId, { is_synced: !col.is_synced });
    toast(col.is_synced ? 'Cloud sync disabled' : 'Cloud sync enabled', { variant: 'success' });
  }, []);

  const handleMoveCollection = useCallback(async (collectionId: string, workspaceId: string | null) => {
    await moveCollectionToWorkspace(collectionId, workspaceId);
    toast(workspaceId ? 'Moved to workspace' : 'Moved to Personal', { variant: 'success' });
  }, [moveCollectionToWorkspace]);

  // Open "create collection" dialog, remembering which workspace section triggered it
  const handleCreateCollection = useCallback((workspaceId?: string | null) => {
    setPendingCollectionWorkspaceId(workspaceId ?? null);
    setCollectionDialog('create');
  }, []);

  const handleCollectionDialogOpenChange = (open: boolean) => {
    if (!open) {
      setCollectionDialog(null);
      setRenameCollectionId(null);
      setPendingCollectionWorkspaceId(null);
    }
  };

  // Memoize to avoid passing a new object reference on every render
  const contextMenuCallbacks = useMemo(() => ({
    onNewRequest: handleNewRequest,
    onNewFolder: handleNewFolder,
    onRenameCollection: handleRenameCollection,
    onRenameFolder: handleRenameFolder,
    onDeleteCollection: handleDeleteCollection,
    onDeleteFolder: handleDeleteFolder,
    onDuplicateRequest: handleDuplicateRequest,
    onMoveRequest: handleMoveRequest,
    onDeleteRequest: handleDeleteRequest,
    onExportCollection: handleExportCollection,
    onCopyAsCurl: handleCopyAsCurl,
    onRenameRequest: handleRenameRequest,
    onToggleSync: handleToggleSync,
    onMoveCollection: handleMoveCollection,
    workspaces,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [handleDeleteCollection, handleDeleteFolder, handleDeleteRequest, handleDuplicateRequest, handleCopyAsCurl, handleToggleSync, handleMoveCollection, workspaces]);

  return (
    <>
      <div className="flex flex-1 min-h-0">
        {/* Tab icon strip */}
        <div className="flex flex-col border-r border-[var(--color-bg-tertiary)] w-12 shrink-0 py-3 gap-2 items-center bg-[#0B1120]">
          <button
            type="button"
            aria-label="Collections"
            onClick={() => setActiveTab('collections')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'collections' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="Collections"
          >
            <Folder className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="History"
            onClick={() => setActiveTab('history')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'history' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Environments"
            onClick={() => setActiveTab('environments')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'environments' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="Environments"
          >
            <Layers className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="API Docs"
            onClick={() => setActiveTab('docs')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'docs' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="API Docs"
          >
            <BookOpen className="h-5 w-5" />
          </button>
        </div>

        {/* Tab content pane */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === 'collections' && (
            <>
              <CollectionSearch />
              <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
                <CollectionsTabSections
                  activeRequestId={activeRequestId}
                  onOpenRequest={handleOpenRequest}
                  contextMenuCallbacks={contextMenuCallbacks}
                  onCreateCollection={handleCreateCollection}
                />
              </div>
            </>
          )}
          {activeTab === 'history' && <HistorySidebarTab />}
          {activeTab === 'environments' &&
            (onOpenEnvironmentManager ? (
              <EnvironmentSidebarTab onOpenManager={onOpenEnvironmentManager} />
            ) : (
              <div className="p-4 text-sm text-gray-500">Environments</div>
            ))}
          {activeTab === 'docs' && <DocsViewerPage />}
        </div>
      </div>

      <CreateCollectionDialog
        open={collectionDialog !== null}
        onOpenChange={handleCollectionDialogOpenChange}
        initialName={collectionDialog === 'rename' ? renameCollectionName : ''}
        mode={collectionDialog === 'rename' ? 'rename' : 'create'}
        onConfirm={async name => {
          if (collectionDialog === 'rename' && renameCollectionId) {
            await renameCollection(renameCollectionId, name);
            setRenameCollectionId(null);
          } else {
            await createCollection(name, pendingCollectionWorkspaceId);
          }
        }}
      />

      <MoveRequestDialog
        open={moveRequestId !== null}
        onOpenChange={open => { if (!open) setMoveRequestId(null); }}
        onConfirm={handleMoveRequestConfirm}
      />

      <NameInputDialog
        open={renameRequestId !== null}
        onOpenChange={open => { if (!open) setRenameRequestId(null); }}
        title="Rename request"
        placeholder="Request name"
        initialName={renameRequestName}
        confirmLabel="Rename"
        onConfirm={async name => {
          if (!renameRequestId) return;
          try {
            await renameRequest(renameRequestId, name);
            setRequestName(renameRequestId, name);
            setRenameRequestId(null);
          } catch (e) {
            toast('Rename failed', {
              description: e instanceof Error ? e.message : 'Unknown error',
              variant: 'error',
            });
            throw e;
          }
        }}
      />

      <CreateFolderDialog
        open={folderDialog !== null}
        onOpenChange={open => {
          if (!open) {
            setFolderDialog(null);
            setRenameFolderId(null);
            setNewFolderContext(null);
          }
        }}
        initialName={folderDialog === 'rename' ? renameFolderName : ''}
        mode={folderDialog === 'rename' ? 'rename' : 'create'}
        onConfirm={async name => {
          if (folderDialog === 'rename' && renameFolderId) {
            await renameFolder(renameFolderId, name);
            setRenameFolderId(null);
          } else if (newFolderContext) {
            await createFolder(newFolderContext.collectionId, newFolderContext.parentId, name);
            setNewFolderContext(null);
          }
        }}
      />

      <ExportDialog
        open={exportCollectionId !== null}
        onOpenChange={open => { if (!open) setExportCollectionId(null); }}
        collectionId={exportCollectionId}
        collectionName={exportCollectionName}
      />
    </>
  );
}
