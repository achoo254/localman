import { AppLayout } from "./components/layout/app-layout";
import { RequestTabBar } from "./components/request/request-tab-bar";
import { RequestPanel } from "./components/request/request-panel";
import "./App.css";

function App() {
  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <RequestTabBar />
        <RequestPanel />
      </div>
    </AppLayout>
  );
}

export default App;
