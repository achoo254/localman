/**
 * Request panel: URL bar + tabs, wired to request store and HTTP execution.
 */

import { useEffect, useCallback, useState } from 'react';
import { useRequestStore } from '../../stores/request-store';
import { useResponseStore } from '../../stores/response-store';
import { useEnvironmentStore } from '../../stores/environment-store';
import { useAutoSave } from '../../hooks/use-auto-save';
import { UrlBar } from './url-bar';
import { RequestTabs } from './request-tabs';
import { parseQueryFromUrl, buildUrlWithParams } from '../../utils/url-params';
import { interpolateString } from '../../services/interpolation-engine';
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

  const [sendError, setSendError] = useState<string | null>(null);

  useAutoSave();

  const getResolvedUrl = useCallback(() => {
    const ctx = useEnvironmentStore.getState().getInterpolationContext();
    return interpolateString(activeRequest?.url ?? '', ctx);
  }, [activeRequest?.url]);

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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-slate-500 bg-[var(--color-bg-primary)]">
        <div className="p-4 rounded-full bg-slate-800/50">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        </div>
        <p className="text-sm">Select a request from the sidebar or create a new one.</p>
        <button
          type="button"
          onClick={handleNewRequest}
          className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-md active:scale-95"
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
    setSendError(null);
    try {
      await saveRequest();
      const latest = useRequestStore.getState().activeRequest;
      if (latest) executeRequest(latest);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send request.');
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {sendError && (
        <div className="shrink-0 mx-2 mt-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
          {sendError}
        </div>
      )}
      <div className="shrink-0 p-2">
        <UrlBar
          method={activeRequest.method}
          url={activeRequest.url}
          onMethodChange={m => updateActiveRequest({ method: m })}
          onUrlChange={handleUrlChange}
          onSend={handleSend}
          onCancel={cancelRequest}
          isLoading={isLoading}
          getResolvedUrl={getResolvedUrl}
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
