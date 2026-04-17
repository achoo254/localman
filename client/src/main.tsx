import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/common/error-boundary";
import { ToastProvider } from "./components/common/toast-provider";

if (typeof performance !== 'undefined' && performance.mark) {
  performance.mark('localman-main-start');
}

/**
 * One-time wipe of the legacy IndexedDB on first boot after sync removal (v5 schema).
 * Resolves schema incompatibility from removed pending_changes table and sync fields.
 * Self-reloads after wipe; the flag prevents repeated wipes.
 */
async function wipeLegacyDb() {
  const RESET_FLAG = 'localman.schemaResetV2';
  if (typeof window === 'undefined' || window.localStorage.getItem(RESET_FLAG)) return;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('localman');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  window.localStorage.setItem(RESET_FLAG, '1');
  window.location.reload();
}

await wipeLegacyDb();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in DOM');
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
