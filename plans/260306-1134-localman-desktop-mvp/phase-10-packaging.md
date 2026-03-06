# Phase 10 — Packaging, Auto-Updater & Polish

## Context
- [Tauri bundler docs](https://tauri.app/distribute/)
- [Tauri auto-updater plugin](https://tauri.app/plugin/updater/)
- Depends on: All previous phases

## Overview
- **Priority:** P1
- **Status:** pending
- **Estimate:** 5 days
- **Description:** Cross-platform builds (Windows/macOS/Linux), auto-updater, settings/preferences UI, performance optimization, final UI polish.

## Key Insights
- Tauri v2 bundler produces: `.msi`/`.exe` (Windows), `.dmg`/`.app` (macOS), `.deb`/`.AppImage` (Linux)
- Auto-updater: `tauri-plugin-updater` checks GitHub releases for new versions
- Code signing required for macOS distribution (notarization)
- Windows: can use self-signed cert for testing, needs proper cert for distribution
- GitHub Actions for CI/CD cross-platform builds

## Requirements

### Functional
- Settings/Preferences page:
  - General: startup behavior, default content type
  - Editor: font size, tab size, word wrap, line numbers
  - Proxy: HTTP/HTTPS proxy configuration
  - Data: export backup, import backup, clear all data
  - About: version, check for updates
- Auto-updater: check on startup, notify user, download + install
- Keyboard shortcuts reference (modal)
- Cross-platform builds: Windows (.msi), macOS (.dmg), Linux (.AppImage)

### Non-Functional
- Startup time < 2s (cold) on all platforms
- Install size < 30MB
- Memory usage < 150MB at idle
- Smooth 60fps UI interactions

## Architecture

### Auto-Updater Flow
```
App startup -> check GitHub releases API -> compare versions
  -> if update available: show notification toast
  -> user clicks "Update" -> download in background
  -> restart to apply
```

### CI/CD Pipeline (GitHub Actions)
```yaml
on: push tag v*
jobs:
  build-windows: (runs-on: windows-latest)
  build-macos: (runs-on: macos-latest)
  build-linux: (runs-on: ubuntu-22.04)
  create-release: upload artifacts to GitHub Release
```

## Related Code Files

### Create
- `src/components/settings/settings-page.tsx` — Settings layout
- `src/components/settings/general-settings.tsx` — General prefs
- `src/components/settings/editor-settings.tsx` — Code editor prefs
- `src/components/settings/proxy-settings.tsx` — Proxy config
- `src/components/settings/data-settings.tsx` — Backup/restore/clear
- `src/components/settings/about-section.tsx` — Version + update check
- `src/components/common/keyboard-shortcuts-modal.tsx` — Shortcut reference
- `.github/workflows/build-release.yml` — CI/CD pipeline
- `src-tauri/tauri.conf.json` — Update bundler config

### Modify
- `src-tauri/Cargo.toml` — Add updater plugin
- `src-tauri/src/lib.rs` — Register updater plugin
- `src/components/layout/titlebar.tsx` — Add settings gear icon
- `src/stores/settings-store.ts` — (create) Settings Zustand store

## Implementation Steps

1. **Build settings Zustand store**
   - Read/write settings to Dexie settings table
   - Default values for all settings
   - Settings categories: general, editor, proxy, data

2. **Build settings page**
   - Full-page view (replaces main content when open)
   - Left nav: General, Editor, Proxy, Data, About
   - Right: setting controls per category
   - Apply changes immediately (auto-save)

3. **Build general settings**
   - Default HTTP method (GET)
   - Default content type (application/json)
   - History retention (count or days)
   - Follow redirects (on/off, max redirects)
   - SSL verification (on/off — for self-signed certs)
   - Request timeout (default 30s)

4. **Build editor settings**
   - Font size (12-20px)
   - Tab size (2 or 4)
   - Word wrap (on/off)
   - Line numbers (on/off)
   - Minimap (on/off)

5. **Build proxy settings**
   - Proxy toggle (on/off)
   - HTTP proxy URL
   - HTTPS proxy URL
   - No-proxy hosts list
   - Proxy auth (username/password)

6. **Build data management**
   - Export full backup (JSON)
   - Import from backup
   - Clear all data (with double confirmation)
   - Storage usage display

7. **Setup auto-updater**
   - Add `tauri-plugin-updater` to Rust deps
   - Configure update endpoint in `tauri.conf.json` (GitHub releases)
   - On startup: check for updates silently
   - Show toast if update available with "Update Now" button
   - Download + install on user confirmation

8. **Build keyboard shortcuts reference**
   - Modal (Ctrl+/) listing all shortcuts
   - Categories: General, Request, Navigation, Editor

9. **Performance optimization**
   - Lazy-load CodeMirror (dynamic import)
   - Lazy-load QuickJS sandbox worker
   - React.memo on heavy components (JSON viewer, tree)
   - Virtualize long lists (history, large collections)
   - Measure startup time, optimize critical path

10. **Setup CI/CD**
    - GitHub Actions workflow for Tauri builds
    - Build on: Windows (MSVC), macOS (universal), Linux (Ubuntu)
    - Upload artifacts to GitHub Release
    - Generate update manifest JSON for auto-updater

11. **Final UI polish**
    - Consistent spacing (4px grid)
    - Loading states and skeletons
    - Error boundaries with user-friendly messages
    - Toast notifications (Radix Toast)
    - Window chrome: custom titlebar, resize handles
    - Responsive sidebar (collapsible)

12. **Cross-platform testing**
    - Test on Windows 10/11
    - Test on macOS 13+ (Intel + Apple Silicon)
    - Test on Ubuntu 22.04 / Fedora
    - Verify fonts, file dialogs, keyboard shortcuts

## Todo List
- [ ] Create settings Zustand store
- [ ] Build settings page with all sections
- [ ] Build general settings controls
- [ ] Build editor settings controls
- [ ] Build proxy settings controls
- [ ] Build data management (backup/restore/clear)
- [ ] Setup Tauri auto-updater plugin
- [ ] Build keyboard shortcuts modal
- [ ] Performance optimization pass
- [ ] Setup GitHub Actions CI/CD
- [ ] Configure Tauri bundler for all platforms
- [ ] Cross-platform testing
- [ ] Final UI polish pass

## Success Criteria
- App builds for Windows/macOS/Linux from CI
- Auto-updater detects and installs updates
- Settings persist across app restarts
- Startup time < 2s, memory < 150MB
- No visual glitches on any platform
- All keyboard shortcuts work

## Risk Assessment
- macOS code signing requires Apple Developer account ($99/year) — can distribute unsigned for beta
- Windows SmartScreen warning without EV cert — can use standard cert, add to known publishers
- Linux fragmentation — AppImage is most portable, test on major distros
- Auto-updater security — verify signatures on updates

## Next Steps
- Beta release to testers
- Collect feedback
- Plan Phase 2 (Sync + Web App)
