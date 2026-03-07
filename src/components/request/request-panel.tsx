/**
 * Request panel: URL bar + tabs, wired to request store and HTTP execution.
 */

import { useEffect } from 'react';
import { useRequestStore } from '../../stores/request-store';
import { useResponseStore } from '../../stores/response-store';
import { useAutoSave } from '../../hooks/use-auto-save';
import { UrlBar } from './url-bar';
import { RequestTabs } from './request-tabs';
import { parseQueryFromUrl, buildUrlWithParams } from '../../utils/url-params';
import * as collectionService from '../../db/services/collection-service';

export function RequestPanel() {
  const activeTabId = useRequestStore(s => s.activeTabId);
  const activeRequest = useRequestStore(s => s.activeRequest);
  const loadRequest = useRequestStore(s => s.loadRequest);
  const updateActiveRequest = useRequestStore(s => s.updateActiveRequest);
  const saveRequest = useRequestStore(s => s.saveRequest);
  const createNewRequest = useRequestStore(s => s.createNewRequest);
  const executeRequest = useResponseStore(s => s.executeRequest);
  const cancelRequest = useResponseStore(s => s.cancelRequest);
  const isLoading = useResponseStore(s => s.isLoading);

  useAutoSave();

  useEffect(() => {
    loadRequest(activeTabId);
  }, [activeTabId, loadRequest]);

  async function handleNewRequest() {
    const collections = await collectionService.getAll();
    let col = collections[0];
    if (!col) {
      col = await collectionService.create({ name: 'Default', description: '', sort_order: 0 });
    }
    await createNewRequest(col.id, null);
  }

  if (!activeRequest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-gray-500">
        <p>Select a request from the sidebar or create a new one.</p>
        <button
          type="button"
          onClick={handleNewRequest}
          className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          New request
        </button>
      </div>
    );
  }

  const handleUrlChange = (url: string) => {
    const params = parseQueryFromUrl(url);
    updateActiveRequest({ url, params });
  };

  const handleSend = async () => {
    await saveRequest();
    executeRequest(activeRequest);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 p-2">
        <UrlBar
          method={activeRequest.method}
          url={activeRequest.url}
          onMethodChange={m => updateActiveRequest({ method: m })}
          onUrlChange={handleUrlChange}
          onSend={handleSend}
          onCancel={cancelRequest}
          isLoading={isLoading}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <RequestTabs
          request={activeRequest}
          onUpdate={partial => {
            if ('params' in partial && partial.params) {
              const url = buildUrlWithParams(activeRequest.url, partial.params);
              updateActiveRequest({ ...partial, url });
            } else {
              updateActiveRequest(partial);
            }
          }}
        />
      </div>
    </div>
  );
}
