# Localman Components Audit

Date: 2026-03-18

## Summary

Total: 82 components, 5 hooks, 5 E2E test suites

### REQUEST (17)
Core request builder with lazy-loaded CodeMirror editors

### RESPONSE (12)
Response viewer with body formatters (JSON, HTML, raw)

### COLLECTIONS (12)
Collection tree with context menus and CRUD dialogs

### SETTINGS (12)
6-section settings page (General, Editor, Proxy, Data, Account, About)

### COMMON (9)
Error boundary, toast, modals, keyboard shortcuts, tables

### ENVIRONMENTS (5)
Environment manager with multi-level variables

### LAYOUT (6)
App frame with resizable sidebar, titlebar, status bar

### HISTORY (4)
Date-grouped history with pagination and filters

### IMPORT/EXPORT (2)
File picker and cURL import, JSON export

### DOCS (3)
Documentation viewer with TOC

### SYNC (2)
Conflict resolution modal (Phase 2)

## Hooks
- useCodemirrorEditor: CodeMirror 6 setup
- useAutoSave: 300ms debounce auto-save
- useCollectionTree: Live tree queries
- useLiveQuery: Dexie reactive wrapper
- useUpdateChecker: 4-hour background check

## E2E Tests (5 suites, 20 tests)
- smoke-test-app-launch-and-ui.spec.ts
- smoke-test-core-workflow.spec.ts
- smoke-test-keyboard-shortcuts.spec.ts
- smoke-test-environments.spec.ts
- smoke-test-import-and-settings.spec.ts

## Status
Production-ready Phase 1 MVP
