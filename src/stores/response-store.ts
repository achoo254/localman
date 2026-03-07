/**
 * Zustand store for HTTP response state: loading, data, error, cancel.
 */

import { create } from 'zustand';
import type { ApiRequest } from '../types/models';
import type { ResponseData } from '../types/response';
import { prepareRequest } from '../services/request-preparer';
import { executeHttp } from '../services/http-client';
import * as historyService from '../db/services/history-service';
import { useEnvironmentStore } from './environment-store';

interface ResponseStore {
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;
  abortController: AbortController | null;

  executeRequest: (request: ApiRequest) => Promise<void>;
  cancelRequest: () => void;
  clearResponse: () => void;
}

export const useResponseStore = create<ResponseStore>((set, get) => ({
  response: null,
  isLoading: false,
  error: null,
  abortController: null,

  async executeRequest(request: ApiRequest) {
    const prev = get().abortController;
    if (prev) prev.abort();
    const controller = new AbortController();
    set({
      isLoading: true,
      error: null,
      response: null,
      abortController: controller,
    });
    try {
      const context = useEnvironmentStore.getState().getInterpolationContext();
      const prepared = prepareRequest(request, context);
      const data = await executeHttp(prepared, { signal: controller.signal });
      set({
        response: data,
        isLoading: false,
        error: null,
        abortController: null,
      });
      try {
        await historyService.add({
          request_id: request.id,
          method: request.method,
          url: prepared.url,
          status_code: data.status,
          response_time: data.responseTime,
          response_size: data.bodySize,
          request_snapshot: {
            method: request.method,
            url: request.url,
            name: request.name,
          },
          response_body: data.body.length > 50000 ? undefined : data.body,
          response_headers: data.headers,
        });
      } catch {
        // History log failed; keep showing response (don't overwrite with error)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        set({ isLoading: false, abortController: null });
        return;
      }
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
        abortController: null,
      });
    }
  },

  cancelRequest() {
    const { abortController } = get();
    if (abortController) abortController.abort();
  },

  clearResponse() {
    set({ response: null, error: null });
  },
}));
