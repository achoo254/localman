/**
 * Main-thread API to run pre/post scripts via the sandbox worker.
 * Uses a serial queue (one script at a time) to avoid onmessage races.
 * On timeout, terminates the worker so stale evalCode doesn't bleed through.
 */

import type {
  ScriptRequest,
  ScriptResponse,
  PreScriptResult,
  PostScriptResult,
  TestResult,
} from './types';

const TIMEOUT_MS = 5500;

let workerInstance: Worker | null = null;

// Serial queue: ensures only one script runs at a time
let queue: Promise<unknown> = Promise.resolve();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('./sandbox-worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return workerInstance;
}

function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

function runInWorker<T>(payload: import('./types').SandboxPayload): Promise<T> {
  // Enqueue: each call waits for the previous to finish before starting
  const task = queue.then(() => {
    return new Promise<T>((resolve, reject) => {
      const worker = getWorker();

      const timeoutId = setTimeout(() => {
        // Terminate and null out so next call gets a fresh worker
        terminateWorker();
        reject(new Error('Script timeout (5s)'));
      }, TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent<T & { error?: string }>) => {
        clearTimeout(timeoutId);
        worker.onmessage = null;
        if (e.data?.error) reject(new Error(e.data.error));
        else resolve(e.data as T);
      };

      worker.onerror = () => {
        clearTimeout(timeoutId);
        worker.onmessage = null;
        reject(new Error('Worker error'));
      };

      worker.postMessage(payload);
    });
  });

  // Swallow errors in the queue chain so a failed task doesn't stall subsequent ones
  queue = task.catch(() => undefined);
  return task;
}

export async function runPreScript(
  script: string,
  request: ScriptRequest,
  variables: Record<string, string>
): Promise<PreScriptResult> {
  if (!script.trim()) {
    return { modifiedRequest: request, newVars: {}, console: [] };
  }
  try {
    return await runInWorker<PreScriptResult>({
      type: 'pre',
      script,
      request,
      variables,
    });
  } catch (err) {
    return {
      modifiedRequest: request,
      newVars: {},
      console: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runPostScript(
  script: string,
  request: ScriptRequest,
  variables: Record<string, string>,
  response: ScriptResponse
): Promise<PostScriptResult> {
  if (!script.trim()) {
    return { testResults: [], newVars: {}, console: [] };
  }
  try {
    return await runInWorker<PostScriptResult>({
      type: 'post',
      script,
      request,
      variables,
      response,
    });
  } catch (err) {
    return {
      testResults: [],
      newVars: {},
      console: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type { ScriptRequest, ScriptResponse, PreScriptResult, PostScriptResult, TestResult };
