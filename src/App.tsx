import { useEffect, useState, useCallback } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { AppLayout } from "./components/layout/app-layout";
import { RequestTabBar } from "./components/request/request-tab-bar";
import { RequestPanel } from "./components/request/request-panel";
import { ResponsePanel } from "./components/response/response-panel";
import { SaveRequestDialog } from "./components/request/save-request-dialog";
import { useRequestStore } from "./stores/request-store";
import { useSettingsStore } from "./stores/settings-store";
import "./App.css";

function App() {
  const loadSettings = useSettingsStore(s => s.load);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogTabId, setSaveDialogTabId] = useState<string | null>(null);

  const openTabs = useRequestStore(s => s.openTabs);
  const updateActiveRequest = useRequestStore(s => s.updateActiveRequest);
  const saveDraftToCollection = useRequestStore(s => s.saveDraftToCollection);

  const saveTab = saveDialogTabId ? openTabs.find(t => t.id === saveDialogTabId) : null;
  const saveDraftName = saveDialogTabId
    ? useRequestStore.getState().drafts[saveDialogTabId]?.name
    : undefined;

  useEffect(() => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('localman-app-mounted');
    }
    void loadSettings();
  }, [loadSettings]);

  const handleRequestSaveDialog = useCallback((tabId: string) => {
    setSaveDialogTabId(tabId);
    setSaveDialogOpen(true);
  }, []);

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <RequestTabBar onRequestSaveDialog={handleRequestSaveDialog} />
        <Group orientation="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={50} minSize={20} id="request">
            <RequestPanel onRequestSaveDialog={handleRequestSaveDialog} />
          </Panel>
          <Separator className="w-1 shrink-0 bg-[var(--color-bg-tertiary)] data-[resize-handle-active]:bg-[var(--color-accent)]" />
          <Panel defaultSize={50} minSize={20} id="response">
            <ResponsePanel />
          </Panel>
        </Group>
      </div>
      <SaveRequestDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        draftTabId={saveDialogTabId}
        prefillCollectionId={saveTab?.prefillCollectionId}
        prefillFolderId={saveTab?.prefillFolderId}
        draftName={saveDraftName}
        onSave={async (tabId, name, collectionId, folderId) => {
          const draft = useRequestStore.getState().drafts[tabId];
          if (draft && name !== draft.name) {
            updateActiveRequest({ name });
          }
          await saveDraftToCollection(tabId, collectionId, folderId);
        }}
      />
    </AppLayout>
  );
}

export default App;
