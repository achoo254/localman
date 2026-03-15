/**
 * Zustand store for HTTP response state: loading, data, error, cancel, script results.
 */

import { create } from 'zustand';
import type { ApiRequest } from '../types/models';
import type { ResponseData } from '../types/response';
import { prepareRequest } from '../services/request-preparer';
import { executeHttp } from '../services/http-client';
import { runPreScript, runPostScript } from '../services/script-sandbox/script-runner';
import * as historyService from '../db/services/history-service';
import { useEnvironmentStore } from './environment-store';
import { useHistoryStore } from './history-store';
import { useSettingsStore } from './settings-store';
import type { TestResult } from '../services/script-sandbox/script-runner';

export type { TestResult };

export interface ScriptResults {
  testResults: TestResult[];
  console: string[];
  error?: string;
}

interface ResponseStore {
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;
  abortController: AbortController | null;
  scriptResults: ScriptResults | null;

  executeRequest: (request: ApiRequest) => Promise<void>;
  cancelRequest: () => void;
  clearResponse: () => void;
}

// Module-level so cancelRequest() can clear the timeout
let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useResponseStore = create<ResponseStore>((set, get) => ({
  response: null,
  isLoading: false,
  error: null,
  abortController: null,
  scriptResults: null,

  async executeRequest(request: ApiRequest) {
    const prev = get().abortController;
    if (prev) prev.abort();
    if (activeTimeoutId) { clearTimeout(activeTimeoutId); activeTimeoutId = null; }
    const controller = new AbortController();
    // Wire timeout from settings — clamp to minimum 1s
    const timeoutMs = Math.max(1000, useSettingsStore.getState().general.requestTimeoutMs);
    activeTimeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);
    set({
      isLoading: true,
      error: null,
      response: null,
      scriptResults: null,
      abortController: controller,
    });
    try {
      const envStore = useEnvironmentStore.getState();
      const context = envStore.getInterpolationContext();
      let prepared = prepareRequest(request, context);
      const scriptVars = { ...context.envVars, ...context.globalVars };

      if (request.pre_script?.trim()) {
        const scriptRequest = {
          method: prepared.method,
          url: prepared.url,
          headers: { ...prepared.headers },
          body: prepared.body ?? null,
        };
        const preResult = await runPreScript(request.pre_script, scriptRequest, scriptVars);
        if (preResult.newVars && Object.keys(preResult.newVars).length > 0) {
          await envStore.applyScriptVariables(preResult.newVars);
        }
        prepared = {
          method: preResult.modifiedRequest.method,
          url: preResult.modifiedRequest.url,
          headers: preResult.modifiedRequest.headers,
          body: preResult.modifiedRequest.body ?? undefined,
        };
      }

      const data = await executeHttp(prepared, { signal: controller.signal });

      let scriptResults: ScriptResults | null = null;
      if (request.post_script?.trim()) {
        const scriptRequest = {
          method: prepared.method,
          url: prepared.url,
          headers: prepared.headers,
          body: prepared.body ?? null,
        };
        const ctx = envStore.getInterpolationContext();
        const postResult = await runPostScript(
          request.post_script,
          scriptRequest,
          { ...ctx.envVars, ...ctx.globalVars },
          {
            status: data.status,
            headers: data.headers,
            body: data.body ?? '',
            responseTime: data.responseTime,
          }
        );
        if (postResult.newVars && Object.keys(postResult.newVars).length > 0) {
          await envStore.applyScriptVariables(postResult.newVars);
        }
        scriptResults = {
          testResults: postResult.testResults,
          console: postResult.console,
          error: postResult.error,
        };
      }

      if (activeTimeoutId) { clearTimeout(activeTimeoutId); activeTimeoutId = null; }
      set({
        response: data,
        isLoading: false,
        error: null,
        abortController: null,
        scriptResults,
      });

      // Skip history for draft requests (not yet saved to a collection)
      if (!request.id.startsWith('draft_')) {
        void useHistoryStore.getState().logEntry({
          request_id: request.id,
          method: request.method,
          url: prepared.url,
          status_code: data.status,
          response_time: data.responseTime,
          response_size: data.bodySize,
          request_snapshot: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            params: request.params,
            body: request.body,
            auth: request.auth,
          },
          response_body: historyService.truncateBody(data.body ?? ''),
          response_headers: data.headers,
        });
      }
    } catch (err) {
      if (activeTimeoutId) { clearTimeout(activeTimeoutId); activeTimeoutId = null; }
      if (err instanceof Error && err.name === 'AbortError') {
        const isTimeout = controller.signal.reason === 'timeout';
        set({
          isLoading: false,
          abortController: null,
          error: isTimeout
            ? `Request timed out after ${Math.round(timeoutMs / 1000)}s`
            : null,
        });
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
    if (activeTimeoutId) { clearTimeout(activeTimeoutId); activeTimeoutId = null; }
    const { abortController } = get();
    if (abortController) abortController.abort();
  },

  clearResponse() {
    set({ response: null, error: null, scriptResults: null });
  },
}));
