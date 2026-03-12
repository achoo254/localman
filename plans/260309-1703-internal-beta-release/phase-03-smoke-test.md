# Phase 03 — Smoke Test

## Overview
- **Priority:** P1
- **Status:** Partially Complete (Automated)
- **Effort:** 1 hour (30 min per platform)
- **Depends on:** Phase 02

Automated smoke test via Playwright (browser-based, localhost:1420). Manual Tauri-specific tests still pending.

## Automated Test Results (Playwright — 19/19 passed)

### App Launch & UI
- [x] App launches without crash
- [x] Dark theme renders correctly
- [x] Titlebar shows LOCALMAN, Import, Settings buttons
- [x] Sidebar visible with Collections/History/Environments tabs
- [x] Status bar shows version + Online indicator
- [x] Window resizable (respects 1280x800 minimum)

### Core Workflow
- [x] Click "New collection" → dialog appears → create collection
- [x] Click "New request" → request builder appears (method, URL, Send)
- [ ] Set method GET, URL `https://httpbin.org/get` — ⚠️ requires Tauri HTTP plugin (manual)
- [ ] Click Send (or Ctrl/Cmd+Enter) → response appears — ⚠️ requires Tauri HTTP plugin (manual)
- [ ] Response shows: status code, headers, body (JSON formatted) — ⚠️ requires Tauri HTTP plugin (manual)
- [ ] Request logged in History tab — ⚠️ requires actual request (manual)
- [x] Request tabs visible (Params, Headers, Body, Auth)
- [x] Response empty state message shown

### Collections & Organization
- [ ] Rename collection — manual
- [ ] Create nested folder inside collection — manual
- [ ] Drag/move request between folders — manual
- [ ] Delete request, delete collection — manual

### Environments
- [x] Environment bar shows "No Environment" selector
- [x] Environment bar shows "Manage" button
- [x] Can open environments sidebar tab
- [ ] Create environment with variable — manual
- [ ] Use `{{base_url}}/get` in URL → resolves correctly — manual
- [ ] Switch between environments — manual

### Import
- [x] Import dialog opens with File and cURL tabs
- [x] cURL import tab has textarea
- [ ] Import cURL command and verify request — manual
- [ ] Verify imported request has correct method, URL, headers — manual

### Settings
- [x] Open Settings → all 6 tabs load (General, Editor, Proxy, Data, Cloud Sync, About)
- [x] Can navigate between settings sections
- [ ] Change UI font size → applies immediately — manual
- [ ] Change default HTTP method → new requests use it — manual
- [ ] Close and reopen app → settings persist — manual (requires Tauri)

### Keyboard Shortcuts
- [x] `Ctrl+T` = New tab
- [x] `Ctrl+W` = Close tab
- [ ] `Ctrl+Enter` = Send request — ⚠️ requires Tauri HTTP plugin (manual)

### Data Persistence
- [ ] Close app completely — requires Tauri
- [ ] Reopen app — requires Tauri
- [ ] Collections, requests, environments still present (IndexedDB) — requires Tauri

## Platform-Specific Checks (Manual Only)

### Windows
- [ ] Custom titlebar: minimize/maximize/close buttons work
- [ ] Window snapping (Win+Arrow) works
- [ ] Taskbar icon appears

### macOS
- [ ] App opens after Gatekeeper bypass (right-click > Open)
- [ ] Custom titlebar: traffic light buttons or close/min/max work
- [ ] Cmd shortcuts (not Ctrl)
- [ ] Retina display: fonts and icons sharp

## Bug Reporting

For each bug found, note:
1. Platform (Win/Mac)
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshot if visual

## Todo

- [x] Complete automated smoke test (Playwright, 19/19 passed)
- [ ] Complete Windows manual smoke test (Tauri build)
- [ ] Complete macOS manual smoke test (Tauri build)
- [ ] Document any bugs found
- [ ] Decide: ship with known bugs or fix first?

## Success Criteria

- Core workflow works on both platforms (create → send → view response)
- Data persists across app restarts
- No crashes during normal usage
- Blocking bugs: 0 (non-blocking cosmetic issues acceptable for internal beta)
