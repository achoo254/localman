/**
 * Response viewer container: status bar, actions, tabs (Body/Headers/Cookies).
 */

import { useResponseStore } from '../../stores/response-store';
import { ResponseStatusBar } from './response-status-bar';
import { ResponseTabs } from './response-tabs';
import { ResponseActions } from './response-actions';
import { Loader2, AlertCircle } from 'lucide-react';

export function ResponsePanel() {
  const response = useResponseStore(s => s.response);
  const isLoading = useResponseStore(s => s.isLoading);
  const error = useResponseStore(s => s.error);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Sending request…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-red-400">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm text-center break-words">{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-gray-500">
        <p className="text-sm">Send a request to see the response.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <ResponseStatusBar data={response} />
      <ResponseActions body={response.body} />
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        <ResponseTabs data={response} />
      </div>
    </div>
  );
}
