# Phase 03 — Smoke Test

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1 hour (30 min per platform)
- **Depends on:** Phase 02

Manual smoke test on both Windows and macOS installed builds.

## Test Checklist (Per Platform)

### App Launch & UI
- [ ] App launches without crash
- [ ] Dark theme renders correctly
- [ ] Titlebar shows LOCALMAN, Import, Settings buttons
- [ ] Sidebar visible with Collections/History/Environments tabs
- [ ] Status bar shows version + Online indicator
- [ ] Window resizable (respects 1280x800 minimum)

### Core Workflow
- [ ] Click "New collection" → dialog appears → create collection
- [ ] Click "New request" → request builder appears
- [ ] Set method GET, URL `https://httpbin.org/get`
- [ ] Click Send (or Ctrl/Cmd+Enter) → response appears
- [ ] Response shows: status code, headers, body (JSON formatted)
- [ ] Request logged in History tab

### Collections & Organization
- [ ] Rename collection
- [ ] Create nested folder inside collection
- [ ] Drag/move request between folders
- [ ] Delete request, delete collection

### Environments
- [ ] Create environment with variable (e.g., `base_url` = `https://httpbin.org`)
- [ ] Use `{{base_url}}/get` in URL → resolves correctly
- [ ] Switch between environments
- [ ] Environment bar shows active env name

### Import
- [ ] Import cURL: `curl -X GET https://httpbin.org/headers -H "Accept: application/json"`
- [ ] Verify imported request has correct method, URL, headers

### Settings
- [ ] Open Settings → all 6 tabs load (General, Editor, Proxy, Data, Cloud Sync, About)
- [ ] Change UI font size → applies immediately
- [ ] Change default HTTP method → new requests use it
- [ ] Close and reopen app → settings persist

### Keyboard Shortcuts
- [ ] `Ctrl/Cmd+Enter` = Send request
- [ ] `Ctrl/Cmd+T` = New tab
- [ ] `Ctrl/Cmd+W` = Close tab

### Data Persistence
- [ ] Close app completely
- [ ] Reopen app
- [ ] Collections, requests, environments still present (IndexedDB)

## Platform-Specific Checks

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

- [ ] Complete Windows smoke test
- [ ] Complete macOS smoke test
- [ ] Document any bugs found
- [ ] Decide: ship with known bugs or fix first?

## Success Criteria

- Core workflow works on both platforms (create → send → view response)
- Data persists across app restarts
- No crashes during normal usage
- Blocking bugs: 0 (non-blocking cosmetic issues acceptable for internal beta)
