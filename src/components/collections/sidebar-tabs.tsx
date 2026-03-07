/**
 * Sidebar tabs: Collections (active), History placeholder, Environments placeholder.
 */

import { useState, useMemo } from 'react';
import { Folder, History, Layers } from 'lucide-react';
import { CollectionSearch } from './collection-search';
import { CollectionTree } from './collection-tree';
import { useCollectionTree } from '../../hooks/use-collection-tree';
import { useRequestStore } from '../../stores/request-store';
import { useCollectionsStore } from '../../stores/collections-store';
import * as requestService from '../../db/services/request-service';
import { CreateCollectionDialog } from './create-collection-dialog';
import { CreateFolderDialog } from './create-folder-dialog';
import { MoveRequestDialog } from './move-request-dialog';
import { ExportDialog } from '../import-export/export-dialog';
import { EnvironmentSidebarTab } from '../environments/environment-sidebar-tab';
import { HistorySidebarTab } from '../history/history-sidebar-tab';
import { getCurlForRequest } from '../../services/import-export-service';
import { useEnvironmentStore } from '../../stores/environment-store';

type TabId = 'collections' | 'history' | 'environments';

interface SidebarTabsProps {
  onOpenEnvironmentManager?: () => void;
}

export function SidebarTabs({ onOpenEnvironmentManager }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('collections');
  const [collectionDialog, setCollectionDialog] = useState<'create' | 'rename' | null>(null);
  const [folderDialog, setFolderDialog] = useState<'create' | 'rename' | null>(null);
  const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null);
  const [renameCollectionName, setRenameCollectionName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [newFolderContext, setNewFolderContext] = useState<{ collectionId: string; parentId: string | null } | null>(null);
  const [moveRequestId, setMoveRequestId] = useState<string | null>(null);
  const [exportCollectionId, setExportCollectionId] = useState<string | null>(null);
  const [exportCollectionName, setExportCollectionName] = useState('');

  const { tree, isLoading } = useCollectionTree();
  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);
  const activeRequestId = useRequestStore(s => s.activeRequest?.id ?? null);
  const openRequest = useRequestStore(s => s.openRequest);
  const createNewRequest = useRequestStore(s => s.createNewRequest);
  const createCollection = useCollectionsStore(s => s.createCollection);
  const createFolder = useCollectionsStore(s => s.createFolder);
  const renameCollection = useCollectionsStore(s => s.renameCollection);
  const renameFolder = useCollectionsStore(s => s.renameFolder);
  const deleteCollection = useCollectionsStore(s => s.deleteCollection);
  const deleteFolder = useCollectionsStore(s => s.deleteFolder);
  const duplicateRequest = useCollectionsStore(s => s.duplicateRequest);
  const deleteRequest = useCollectionsStore(s => s.deleteRequest);
  const moveRequestToCollection = useCollectionsStore(s => s.moveRequestToCollection);

  const handleOpenRequest = async (requestId: string) => {
    const req = await requestService.getById(requestId);
    if (req) openRequest(req);
  };

  const handleNewRequest = (collectionId: string, folderId: string | null) => {
    createNewRequest(collectionId, folderId);
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

  const handleDeleteCollection = async (id: string) => {
    if (window.confirm('Delete this collection and all its folders and requests?')) {
      await deleteCollection(id);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (window.confirm('Delete this folder and its contents?')) {
      await deleteFolder(id);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('Delete this request?')) {
      await deleteRequest(id);
    }
  };

  const handleDuplicateRequest = async (id: string) => {
    const copy = await duplicateRequest(id);
    if (copy) openRequest(copy);
  };

  const handleMoveRequest = (id: string) => {
    setMoveRequestId(id);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [deleteCollection, deleteFolder, deleteRequest, duplicateRequest, moveRequestToCollection, openRequest]);

  const handleCollectionDialogOpenChange = (open: boolean) => {
    if (!open) {
      setCollectionDialog(null);
      setRenameCollectionId(null);
    }
  };

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col border-r border-[var(--color-bg-tertiary)] w-12 shrink-0 py-3 gap-2 items-center bg-[#0B1120]">
          <button
            type="button"
            onClick={() => setActiveTab('collections')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'collections' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="Collections"
          >
            <Folder className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'history' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('environments')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTab === 'environments' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            title="Environments"
          >
            <Layers className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === 'collections' && (
            <>
              <CollectionSearch />
              <div className="flex-1 overflow-auto min-h-0 custom-scrollbar pb-2">
                {isLoading ? (
                  <p className="p-4 text-sm text-gray-500">Loading…</p>
                ) : tree.length === 0 ? (
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
                      onClick={() => setCollectionDialog('create')}
                      className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-md active:scale-95"
                    >
                      Create Collection
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <CollectionTree
                      tree={tree}
                      onOpenRequest={handleOpenRequest}
                      activeRequestId={activeRequestId}
                      contextMenuCallbacks={contextMenuCallbacks}
                    />
                    <div className="px-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setCollectionDialog('create')}
                        className="w-full rounded-lg border border-dashed border-slate-700/60 py-2.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-200 hover:border-slate-500 hover:bg-white/[0.02]"
                      >
                        + New collection
                      </button>
                    </div>
                  </div>
                )}
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
            await createCollection(name);
          }
        }}
      />

      <MoveRequestDialog
        open={moveRequestId !== null}
        onOpenChange={open => { if (!open) setMoveRequestId(null); }}
        onConfirm={handleMoveRequestConfirm}
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
