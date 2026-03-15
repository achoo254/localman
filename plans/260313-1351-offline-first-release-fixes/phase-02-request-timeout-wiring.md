---
phase: 02
title: Request Timeout Wiring
priority: high
status: completed
effort: low
completed: 2026-03-13
---

# Phase 02: Request Timeout Wiring

## Context
- Setting already exists: `GENERAL_REQUEST_TIMEOUT_MS` in `src/types/settings.ts` (line 8)
- Store already persists: `src/stores/settings-store.ts` (line 66, 90)
- UI control already exists: `src/components/settings/general-settings.tsx` (lines 54-64)
- **Gap:** `tauriFetchDirect()` in `src/utils/tauri-http-client.ts` accepts `signal` but caller doesn't create AbortController with timeout

## Overview

Wire the existing timeout setting to an AbortController that auto-aborts HTTP requests. Add cancel button in request execution UI.

## Related Code Files

**Modify:**
- `src/utils/tauri-http-client.ts` — add timeout AbortController
- `src/stores/response-store.ts` (or wherever `executeHttp` is called) — pass timeout, expose cancel function
- Request panel send button area — add cancel button while loading

**No changes needed:**
- `src/types/settings.ts` — already has `GENERAL_REQUEST_TIMEOUT_MS`
- `src/stores/settings-store.ts` — already loads/saves timeout
- `src/components/settings/general-settings.tsx` — already has UI control

## Implementation Steps

1. **In the HTTP execution caller** (find where `tauriFetchDirect` or `executeHttp` is invoked):
   - Read `useSettingsStore.getState().general.requestTimeoutMs`
   - Create `AbortController` with `AbortSignal.timeout(timeoutMs)`
   - If user also provides a manual signal, combine with `AbortSignal.any([timeoutSignal, userSignal])`
   - Pass combined signal to fetch

2. **Add cancel support in response store:**
   - Store current `AbortController` in store state
   - Expose `cancelRequest()` action that calls `controller.abort()`
   - Clear controller after request completes

3. **Add cancel button in UI:**
   - While `isLoading === true`, show "Cancel" button next to Send
   - onClick → `cancelRequest()`
   - On abort: show toast "Request cancelled" or "Request timed out" based on abort reason

4. **Error differentiation:**
   - `AbortError` with reason "timeout" → "Request timed out after {X}s"
   - `AbortError` with reason "cancel" → "Request cancelled"
   - Other errors → existing error handling

## Todo List

- [x] Find HTTP execution entry point (response-store or request execution service)
- [x] Create AbortController with timeout from settings
- [x] Pass signal to tauriFetchDirect
- [x] Store AbortController reference for manual cancel
- [x] Add cancelRequest() action to response store
- [x] Add Cancel button in request panel UI (visible during loading)
- [x] Differentiate timeout vs manual cancel in error messages
- [x] Test: set timeout to 1s, hit slow API → confirm timeout error
- [x] Test: click Cancel during request → confirm cancellation
- [x] Verify existing tests pass

## Success Criteria

- Requests auto-abort after configured timeout (default 30s)
- User can cancel in-flight requests via Cancel button
- Clear error messages distinguish timeout vs cancellation
- Settings UI already works — just verify integration
