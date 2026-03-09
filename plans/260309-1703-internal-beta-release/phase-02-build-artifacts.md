# Phase 02 — Build Artifacts

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1 hour
- **Depends on:** Phase 01

Build installable desktop apps for Windows and macOS.

## Build Commands

### Windows (via GitLab CI or local)

```bash
# Option A: Tag-triggered CI build (preferred)
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1
# GitLab CI runs build-windows job → artifacts downloadable from pipeline

# Option B: Local build
pnpm tauri build
# Outputs: src-tauri/target/release/bundle/msi/*.msi
#          src-tauri/target/release/bundle/nsis/*.exe
```

### macOS (local build on Mac)

```bash
pnpm install
pnpm tauri build
# Output: src-tauri/target/release/bundle/dmg/*.dmg
#         src-tauri/target/release/bundle/macos/*.app
```

## Pre-Build Checklist

- [ ] Phase 01 complete (lint clean)
- [ ] `pnpm install` fresh on both machines
- [ ] Rust toolchain installed (`rustup show`)
- [ ] On macOS: Xcode Command Line Tools installed

## Expected Artifacts

| Platform | Format | Location |
|----------|--------|----------|
| Windows | `.msi` | `src-tauri/target/release/bundle/msi/` |
| Windows | `.exe` (NSIS) | `src-tauri/target/release/bundle/nsis/` |
| macOS | `.dmg` | `src-tauri/target/release/bundle/dmg/` |
| macOS | `.app` | `src-tauri/target/release/bundle/macos/` |

## Build Config Verification

From `src-tauri/tauri.conf.json`:
- Product name: `localman`
- Version: `0.1.0`
- Bundle targets: `all`
- Icons: complete set (ICO, ICNS, PNG)
- Min window: 1280x800
- Category: `DeveloperTool`

## Known Considerations

- **Updater endpoints empty** — safe to ignore for beta (plugin installed but not active)
- **No code signing** — Windows SmartScreen will warn; macOS Gatekeeper will block (right-click > Open workaround)
- **QuickJS WASM** — large uncompressed (~1.5GB source) but gzips to ~457KB in bundle

## Todo

- [ ] Build Windows artifact (.msi + .exe)
- [ ] Build macOS artifact (.dmg)
- [ ] Verify both installers open and show Localman UI
- [ ] Note file sizes for distribution

## Success Criteria

- Both .msi and .dmg install without errors
- App launches and shows main UI on both platforms
- No crash on startup
