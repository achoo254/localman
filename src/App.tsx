import { useEffect } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { AppLayout } from "./components/layout/app-layout";
import { RequestTabBar } from "./components/request/request-tab-bar";
import { RequestPanel } from "./components/request/request-panel";
import { ResponsePanel } from "./components/response/response-panel";
import { useSettingsStore } from "./stores/settings-store";
import "./App.css";

function App() {
  const loadSettings = useSettingsStore(s => s.load);
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <RequestTabBar />
        <Group orientation="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={50} minSize={20} id="request">
            <RequestPanel />
          </Panel>
          <Separator className="w-1 shrink-0 bg-[var(--color-bg-tertiary)] data-[resize-handle-active]:bg-[var(--color-accent)]" />
          <Panel defaultSize={50} minSize={20} id="response">
            <ResponsePanel />
          </Panel>
        </Group>
      </div>
    </AppLayout>
  );
}

export default App;
