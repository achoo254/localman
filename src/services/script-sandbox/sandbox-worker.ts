/**
 * Web Worker: runs user script in QuickJS WASM with injected `lm` API.
 */

import { getQuickJS, type QuickJSContext, type QuickJSHandle } from 'quickjs-emscripten';
import type { SandboxPayload, PreScriptResult, PostScriptResult, TestResult } from './types';

const SCRIPT_TIMEOUT_MS = 5000;

function dumpSafe(vm: QuickJSContext, h: unknown): unknown {
  if (h == null) return undefined;
  try {
    return vm.dump(h as QuickJSHandle);
  } catch {
    return undefined;
  }
}

self.onmessage = async (e: MessageEvent<SandboxPayload>) => {
  const payload = e.data;
  const vars: Record<string, string> = { ...payload.variables };
  const consoleLogs: string[] = [];
  const tests: { name: string; fnHandle: QuickJSHandle }[] = [];
  const testResults: TestResult[] = [];

  const timeoutId = setTimeout(() => {
    postMessage({ error: 'Script timeout (5s)' });
  }, SCRIPT_TIMEOUT_MS);

  try {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();

    const request = { ...payload.request };
    const response = payload.type === 'post' ? payload.response : null;

    const newVarHandle = vm.newObject();
    const getHandle = vm.newFunction('get', (keyHandle: unknown) => {
      const key = String(dumpSafe(vm, keyHandle) ?? '');
      return vm.newString(vars[key] ?? '');
    });
    const setHandle = vm.newFunction('set', (keyHandle: unknown, valueHandle: unknown) => {
      const key = String(dumpSafe(vm, keyHandle) ?? '');
      const value = String(dumpSafe(vm, valueHandle) ?? '');
      vars[key] = value;
      return vm.undefined;
    });
    vm.setProp(newVarHandle, 'get', getHandle);
    vm.setProp(newVarHandle, 'set', setHandle);
    getHandle.dispose();
    setHandle.dispose();

    const reqHandle = vm.newObject();
    ['method', 'url', 'body'].forEach(k => {
      const v = (request as Record<string, unknown>)[k];
      vm.setProp(reqHandle, k, typeof v === 'string' ? vm.newString(v) : vm.newString(String(v ?? '')));
    });
    const headersHandle = vm.newObject();
    Object.entries(request.headers).forEach(([k, v]) => {
      vm.setProp(headersHandle, k, vm.newString(v ?? ''));
    });
    vm.setProp(reqHandle, 'headers', headersHandle);
    headersHandle.dispose();

    const lmHandle = vm.newObject();
    vm.setProp(lmHandle, 'variables', newVarHandle);
    vm.setProp(lmHandle, 'request', reqHandle);
    newVarHandle.dispose();
    reqHandle.dispose();

    const logHandle = vm.newFunction('log', (...args: unknown[]) => {
      const msg = args.map(a => String(dumpSafe(vm, a) ?? '')).join(' ');
      consoleLogs.push(msg);
      return vm.undefined;
    });
    vm.setProp(vm.global, 'console', vm.newObject());
    vm.setProp(vm.getProp(vm.global, 'console'), 'log', logHandle);
    logHandle.dispose();

    if (payload.type === 'post' && response) {
      const respHandle = vm.newObject();
      vm.setProp(respHandle, 'status', vm.newNumber(response.status));
      vm.setProp(respHandle, 'body', vm.newString(response.body ?? ''));
      vm.setProp(respHandle, 'responseTime', vm.newNumber(response.responseTime));
      const respHeadersHandle = vm.newObject();
      Object.entries(response.headers).forEach(([k, v]) => {
        vm.setProp(respHeadersHandle, k, vm.newString(v ?? ''));
      });
      vm.setProp(respHandle, 'headers', respHeadersHandle);
      respHeadersHandle.dispose();
      vm.setProp(respHandle, 'json', vm.newFunction('json', () => {
        try {
          const parsed = JSON.parse(response.body ?? '{}');
          const code = '(' + JSON.stringify(parsed) + ')';
          const r = vm.evalCode(code);
          if (r.error) {
            r.error.dispose();
            return vm.undefined;
          }
          return r.value ?? vm.undefined;
        } catch {
          return vm.undefined;
        }
      }));
      vm.setProp(lmHandle, 'response', respHandle);
      respHandle.dispose();

      const testHandle = vm.newFunction('test', (nameHandle: unknown, fnHandle: unknown) => {
        const name = String(dumpSafe(vm, nameHandle) ?? '');
        tests.push({ name, fnHandle: fnHandle as QuickJSHandle });
        return vm.undefined;
      });
      vm.setProp(lmHandle, 'test', testHandle);
      testHandle.dispose();

      const expectHandle = vm.newFunction('expect', (valueHandle: unknown) => {
        const value = dumpSafe(vm, valueHandle);
        const toBe = vm.newFunction('toBe', (expectedHandle: unknown) => {
          const expected = dumpSafe(vm, expectedHandle);
          if (JSON.stringify(value) !== JSON.stringify(expected)) {
            return vm.newError(`Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
          }
          return vm.undefined;
        });
        const toEqual = vm.newFunction('toEqual', (expectedHandle: unknown) => {
          const expected = dumpSafe(vm, expectedHandle);
          if (JSON.stringify(value) !== JSON.stringify(expected)) {
            return vm.newError(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
          }
          return vm.undefined;
        });
        const expectObj = vm.newObject();
        vm.setProp(expectObj, 'toBe', toBe);
        vm.setProp(expectObj, 'toEqual', toEqual);
        toBe.dispose();
        toEqual.dispose();
        return expectObj;
      });
      vm.setProp(lmHandle, 'expect', expectHandle);
      expectHandle.dispose();
    }

    vm.setProp(vm.global, 'lm', lmHandle);

    const result = vm.evalCode(payload.script);
    if (result.error) {
      const errMsg = String(dumpSafe(vm, result.error) ?? 'Script error');
      result.error.dispose();
      clearTimeout(timeoutId);
      postMessage(payload.type === 'pre' ? { error: errMsg, modifiedRequest: request, newVars: vars, console: consoleLogs } : { error: errMsg, testResults: [], newVars: vars, console: consoleLogs });
      vm.dispose();
      return;
    }
    result.value?.dispose();

    if (payload.type === 'post' && tests.length > 0) {
      for (const { name, fnHandle } of tests) {
        const callResult = vm.callFunction(fnHandle, vm.undefined);
        if (callResult.error) {
          testResults.push({ name, pass: false, message: String(dumpSafe(vm, callResult.error) ?? 'Failed') });
          callResult.error.dispose();
        } else {
          testResults.push({ name, pass: true });
          callResult.value?.dispose();
        }
      }
    }

    if (payload.type === 'pre') {
      const outReq = { ...request };
      try {
        const lm = vm.getProp(vm.global, 'lm');
        const reqObj = vm.getProp(lm, 'request');
        lm.dispose();
        outReq.method = String(dumpSafe(vm, vm.getProp(reqObj, 'method')) ?? request.method);
        outReq.url = String(dumpSafe(vm, vm.getProp(reqObj, 'url')) ?? request.url);
        outReq.body = (dumpSafe(vm, vm.getProp(reqObj, 'body')) as string | null) ?? request.body;
        const h = vm.getProp(reqObj, 'headers');
        if (h) {
          const headersObj = dumpSafe(vm, h) as Record<string, string> | undefined;
          if (headersObj && typeof headersObj === 'object') outReq.headers = { ...headersObj };
          h.dispose();
        }
        reqObj.dispose();
      } catch {
        // keep outReq as copy of request
      }
      lmHandle.dispose();
      const res: PreScriptResult = { modifiedRequest: outReq, newVars: vars, console: consoleLogs };
      clearTimeout(timeoutId);
      postMessage(res);
    } else {
      lmHandle.dispose();
      const res: PostScriptResult = { testResults, newVars: vars, console: consoleLogs };
      clearTimeout(timeoutId);
      postMessage(res);
    }
    vm.dispose();
  } catch (err) {
    clearTimeout(timeoutId);
    postMessage({
      error: err instanceof Error ? err.message : String(err),
      ...(payload.type === 'pre'
        ? { modifiedRequest: payload.request, newVars: vars, console: consoleLogs }
        : { testResults: [], newVars: vars, console: consoleLogs }),
    });
  }
};
