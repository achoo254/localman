# Phase 09 — Pre/Post Scripts (QuickJS Sandbox)

## Context
- [QuickJS](https://bellard.org/quickjs/) — lightweight JS engine
- [requirement.md Section 4.1](../../requirement.md) — Pre-request & Post-response scripts
- Depends on: Phase 04

## Overview
- **Priority:** P2
- **Status:** pending
- **Estimate:** 5 days
- **Description:** JavaScript sandbox for pre-request and post-response scripts using QuickJS (via WASM or Tauri Rust integration). Scripts can set variables, modify requests, run assertions on responses.

## Key Insights
- QuickJS runs JS in isolated sandbox — no access to DOM, network, or filesystem
- Two integration options:
  1. **QuickJS WASM** (`quickjs-emscripten` npm package) — runs in web worker, simpler
  2. **QuickJS via Rust** (Tauri command) — better isolation, more control
- Recommend: **QuickJS WASM** for MVP (simpler integration, good enough isolation)
- Scripts interact via injected global object (`lm` or `pm` for Postman compat)
- Pre-script: runs before request, can modify request params/headers/body, set variables
- Post-script: runs after response, can read response, run assertions (tests)

## Requirements

### Functional
- Pre-request script: execute JS before sending request
- Post-response script: execute JS after receiving response
- Script API (`lm` object):
  - `lm.variables.set(key, value)` — set environment variable
  - `lm.variables.get(key)` — get variable value
  - `lm.request` — access/modify current request (pre-script only)
  - `lm.response` — access response data (post-script only)
  - `lm.test(name, fn)` — define test assertion (post-script)
  - `lm.expect(value)` — chai-like assertions
- Script editor: CodeMirror with JS syntax highlighting
- Script console output (console.log captured)
- Test results panel (pass/fail for each `lm.test()`)
- Script execution timeout (5s default)

### Non-Functional
- Script startup < 100ms
- Script execution doesn't block main thread (Web Worker)
- Memory-safe (QuickJS limits)

## Architecture

### Script Execution Flow
```
Pre-script:
1. Create QuickJS sandbox (Web Worker)
2. Inject `lm` object with request data + variables
3. Execute user script
4. Extract modified request + new variables
5. Apply modifications to request before sending

Post-script:
1. Create QuickJS sandbox (Web Worker)
2. Inject `lm` object with response data + variables
3. Execute user script
4. Collect test results + console output + new variables
5. Display test results in response panel
```

### Script API Design
```typescript
// Injected into QuickJS sandbox
const lm = {
  variables: {
    get: (key: string) => string | undefined,
    set: (key: string, value: string) => void,
  },
  request: {
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | null,
  },
  response: {             // post-script only
    status: number,
    headers: Record<string, string>,
    body: string,
    json: () => any,
    responseTime: number,
  },
  test: (name: string, fn: () => void) => void,
  expect: (value: any) => ChaiLikeAssertions,
};
```

### Web Worker Architecture
```
Main Thread                    Web Worker
    |                              |
    |-- postMessage(script, ctx) ->|
    |                              |-- init QuickJS WASM
    |                              |-- inject lm object
    |                              |-- eval(script)
    |                              |-- collect results
    |<- postMessage(results) ------|
```

## Related Code Files

### Create
- `src/services/script-sandbox/sandbox-worker.ts` — Web Worker with QuickJS
- `src/services/script-sandbox/script-runner.ts` — Main thread API to run scripts
- `src/services/script-sandbox/script-api.ts` — `lm` object definition
- `src/services/script-sandbox/assertion-lib.ts` — `lm.expect()` implementation
- `src/components/request/pre-script-tab.tsx` — Pre-script CodeMirror editor
- `src/components/request/post-script-tab.tsx` — Post-script CodeMirror editor
- `src/components/response/test-results-panel.tsx` — Test pass/fail results
- `src/components/response/script-console.tsx` — console.log output

### Modify
- `src/stores/response-store.ts` — Run pre/post scripts in executeRequest flow
- `src/services/request-preparer.ts` — Apply pre-script modifications
- `src/components/response/response-tabs.tsx` — Add Tests tab

## Implementation Steps

1. **Setup QuickJS WASM**
   - Install `quickjs-emscripten` npm package
   - Create Web Worker that initializes QuickJS runtime
   - Test basic script execution roundtrip

2. **Build script API (`lm` object)**
   - Define `lm.variables`, `lm.request`, `lm.response`
   - Implement `lm.test()` — collect test name + pass/fail
   - Implement `lm.expect()` — basic assertions (toBe, toEqual, toContain, toHaveProperty)
   - Capture `console.log` output

3. **Build script runner service**
   - `runPreScript(script, request, variables) -> { modifiedRequest, newVars, console, errors }`
   - `runPostScript(script, response, variables) -> { testResults, newVars, console, errors }`
   - Timeout handling (terminate worker after 5s)
   - Error capture (syntax errors, runtime errors)

4. **Build script editor tabs**
   - Pre-script tab: CodeMirror with JS language support
   - Post-script tab: same
   - Snippet buttons: common patterns (set variable, test status, parse JSON)
   - Script saved as part of request model (`pre_script`, `post_script` fields)

5. **Build test results panel**
   - Show in response area after post-script runs
   - List: test name + pass/fail icon + error message if failed
   - Summary: X/Y tests passed

6. **Build script console**
   - Show captured `console.log` output
   - Collapsible panel below test results

7. **Integrate into request execution flow**
   - In `executeRequest()`:
     - Before send: if pre_script exists, run it, apply modifications
     - After response: if post_script exists, run it, collect results
   - Store test results in response store

8. **Script variable persistence**
   - Variables set via `lm.variables.set()` persist to active environment
   - Useful for chaining requests (e.g., save auth token from login response)

## Todo List
- [ ] Setup QuickJS WASM in Web Worker
- [ ] Build `lm` script API object
- [ ] Build assertion library (`lm.expect()`)
- [ ] Build script runner service (pre + post)
- [ ] Build pre-script editor tab (CodeMirror JS)
- [ ] Build post-script editor tab
- [ ] Build test results panel
- [ ] Build script console output
- [ ] Integrate scripts into request execution flow
- [ ] Handle script errors and timeouts
- [ ] Script variable persistence to environment

## Success Criteria
- Pre-script can modify request headers/body before sending
- Post-script can assert on response status/body
- Test results show pass/fail per `lm.test()` call
- Script errors don't crash the app
- 5s timeout kills runaway scripts
- `lm.variables.set()` persists to active environment

## Risk Assessment
- QuickJS WASM bundle size (~500KB) — acceptable, lazy-load on first script execution
- Web Worker communication overhead — negligible for script sizes
- Script API compatibility with Postman `pm` object — offer `pm` alias for migration but don't guarantee 100% compat

## Security Considerations
- QuickJS sandbox has no access to: filesystem, network, DOM, Tauri APIs
- Scripts run in Web Worker (isolated from main thread)
- Memory limits via QuickJS runtime config
- Execution timeout prevents infinite loops

## Next Steps
- Phase 10: Packaging & Polish
