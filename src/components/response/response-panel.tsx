/**
 * Response viewer container: status bar, actions, tabs (Body/Headers/Cookies).
 * When a history entry is selected, shows its snapshot (read-only).
 */

import { useResponseStore } from '../../stores/response-store';
import { useHistoryStore } from '../../stores/history-store';
import type { ResponseData } from '../../types/response';
import { ResponseStatusBar } from './response-status-bar';
import { ResponseTabs } from './response-tabs';
import { ResponseActions } from './response-actions';
import { Loader2, AlertCircle, History } from 'lucide-react';

function historyEntryToResponseData(entry: { status_code: number; response_time: number; response_headers?: Record<string, string>; response_body?: string }): ResponseData {
  return {
    status: entry.status_code,
    statusText: '',
    headers: entry.response_headers ?? {},
    cookies: [],
    body: entry.response_body ?? '',
    bodySize: (entry.response_body?.length ?? 0),
    responseTime: entry.response_time,
    contentType: '',
  };
}

export function ResponsePanel() {
  const response = useResponseStore(s => s.response);
  const isLoading = useResponseStore(s => s.isLoading);
  const error = useResponseStore(s => s.error);
  const scriptResults = useResponseStore(s => s.scriptResults);
  const selectedHistoryEntry = useHistoryStore(s => s.selectedEntry);
  const setSelectedEntry = useHistoryStore(s => s.setSelectedEntry);

  const displayResponse = selectedHistoryEntry
    ? historyEntryToResponseData(selectedHistoryEntry)
    : response;

  if (isLoading && !selectedHistoryEntry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-slate-400 bg-[var(--color-bg-primary)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-accent)]" />
        <p className="text-sm font-medium tracking-wide">Sending request…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-red-400 bg-[var(--color-bg-primary)]">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm text-center break-words font-mono bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</p>
      </div>
    );
  }

  if (!displayResponse) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-slate-500 bg-[var(--color-bg-primary)]">
        <div className="p-4 rounded-full bg-slate-800/50 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <p className="text-sm">Send a request or select a history entry to see the response.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {selectedHistoryEntry && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-bg-tertiary)] text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Viewing history snapshot
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200"
            onClick={() => setSelectedEntry(null)}
          >
            Close
          </button>
        </div>
      )}
      <ResponseStatusBar data={displayResponse} />
      <ResponseActions body={displayResponse.body} />
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        <ResponseTabs data={displayResponse} scriptResults={scriptResults} />
      </div>
    </div>
  );
}
