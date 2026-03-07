/**
 * Sidebar tabs: Collections (active), History placeholder, Environments placeholder.
 */

import { useState } from 'react';
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

type TabId = 'collections' | 'history' | 'environments';

export function SidebarTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('collections');
  const [collectionDialog, setCollectionDialog] = useState<'create' | 'rename' | null>(null);
  const [folderDialog, setFolderDialog] = useState<'create' | 'rename' | null>(null);
  const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null);
  const [renameCollectionName, setRenameCollectionName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [newFolderContext, setNewFolderContext] = useState<{ collectionId: string; parentId: string | null } | null>(null);
  const [moveRequestId, setMoveRequestId] = useState<string | null>(null);

  const { tree, isLoading } = useCollectionTree();
  const activeRequestId = useRequestStore(s => s.activeRequest?.id ?? null);
  const openRequest = useRequestStore(s => s.openRequest);
  const createCollection = useCollectionsStore(s => s.createCollection);
  const createFolder = useCollectionsStore(s => s.createFolder);
  const renameCollection = useCollectionsStore(s => s.renameCollection);
  const renameFolder = useCollectionsStore(s => s.renameFolder);
  const deleteCollection = useCollectionsStore(s => s.deleteCollection);
  const deleteFolder = useCollectionsStore(s => s.deleteFolder);
  const duplicateRequest = useCollectionsStore(s => s.duplicateRequest);
  const deleteRequest = useCollectionsStore(s => s.deleteRequest);

  const handleOpenRequest = async (requestId: string) => {
    const req = await requestService.getById(requestId);
    if (req) openRequest(req);
  };

  const handleNewRequest = (collectionId: string, folderId: string | null) => {
    useRequestStore.getState().createNewRequest(collectionId, folderId);
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
    await useCollectionsStore.getState().moveRequestToCollection(moveRequestId, collectionId, folderId);
    setMoveRequestId(null);
  };

  const contextMenuCallbacks = {
    onNewRequest: handleNewRequest,
    onNewFolder: handleNewFolder,
    onRenameCollection: handleRenameCollection,
    onRenameFolder: handleRenameFolder,
    onDeleteCollection: handleDeleteCollection,
    onDeleteFolder: handleDeleteFolder,
    onDuplicateRequest: handleDuplicateRequest,
    onMoveRequest: handleMoveRequest,
    onDeleteRequest: handleDeleteRequest,
  };

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col border-r border-[var(--color-bg-tertiary)] w-10 shrink-0 py-2 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('collections')}
            className={`p-2 rounded ${activeTab === 'collections' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]' : 'text-gray-500 hover:text-[var(--foreground)]'}`}
            title="Collections"
          >
            <Folder className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`p-2 rounded ${activeTab === 'history' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]' : 'text-gray-500 hover:text-[var(--foreground)]'}`}
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('environments')}
            className={`p-2 rounded ${activeTab === 'environments' ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]' : 'text-gray-500 hover:text-[var(--foreground)]'}`}
            title="Environments"
          >
            <Layers className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === 'collections' && (
            <>
              <CollectionSearch />
              <div className="flex-1 overflow-auto min-h-0">
                {isLoading ? (
                  <p className="p-4 text-sm text-gray-500">Loading…</p>
                ) : tree.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No collections</p>
                ) : (
                  <CollectionTree
                    tree={tree}
                    onOpenRequest={handleOpenRequest}
                    activeRequestId={activeRequestId}
                    contextMenuCallbacks={contextMenuCallbacks}
                  />
                )}
              </div>
              <div className="p-2 border-t border-[var(--color-bg-tertiary)]">
                <button
                  type="button"
                  onClick={() => setCollectionDialog('create')}
                  className="w-full rounded border border-dashed border-[var(--color-bg-tertiary)] py-2 text-sm text-gray-500 hover:text-[var(--foreground)] hover:border-[var(--color-accent)]"
                >
                  New collection
                </button>
              </div>
            </>
          )}
          {activeTab === 'history' && (
            <div className="p-4 text-sm text-gray-500">History (Phase 07)</div>
          )}
          {activeTab === 'environments' && (
            <div className="p-4 text-sm text-gray-500">Environments (Phase 06)</div>
          )}
        </div>
      </div>

      <CreateCollectionDialog
        open={collectionDialog !== null}
        onOpenChange={open => !open && (setCollectionDialog(null), setRenameCollectionId(null))}
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
        onOpenChange={open => !open && setMoveRequestId(null)}
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
    </>
  );
}
