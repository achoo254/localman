# Cross-Platform Testing Checklist

Manual verification for Localman desktop builds across Windows, macOS, and Linux.

## Prerequisites

- Built artifacts per platform (from CI or local `pnpm tauri build`)
- Windows: `.msi` or NSIS `.exe`
- macOS: `.dmg` or `.app`
- Linux: `.AppImage` or `.deb`

## Windows 10/11

- [ ] Install from `.msi` or run `.exe` — no SmartScreen block (or accept warning for unsigned)
- [ ] App starts; window shows titlebar, env bar, sidebar, request/response panes
- [ ] Sidebar collapse/expand works
- [ ] Sidebar resize: drag handle between sidebar and main works; width clamped 200–480px and persisted (localStorage)
- [ ] Create collection, add request, send HTTP request — response appears
- [ ] Environment switch and variable interpolation in URL
- [ ] Settings open from gear icon; General/Editor/Proxy/Data/About sections
- [ ] Keyboard: Ctrl+Enter sends request, Ctrl+T new tab, Ctrl+/ shortcuts modal
- [ ] Fonts: JetBrains Mono and Syne render correctly
- [ ] File dialogs (e.g. Body → Binary) open native picker
- [ ] No console errors or crashes during normal use

## macOS 13+ (Intel and Apple Silicon)

- [ ] Open `.dmg`, drag app to Applications (Gatekeeper warning expected for unsigned beta)
- [ ] Same functional checks as Windows: sidebar, request/response, env, settings
- [ ] Cmd+Enter, Cmd+T, Cmd+/ for shortcuts
- [ ] Native file dialogs and window chrome (traffic lights, resize)
- [ ] Retina display: sharp text and icons

## Linux (Ubuntu 22.04 / Fedora)

- [ ] Run `.AppImage` (or install `.deb` if used)
- [ ] Same functional checks: sidebar, request/response, env, settings
- [ ] Ctrl+Enter, Ctrl+T, Ctrl+/ (not Super)
- [ ] System tray/theme integration if applicable
- [ ] Fonts and scaling in GNOME/KDE

## Performance (all platforms)

- [ ] Cold startup < 2s
- [ ] Idle memory < 150MB
- [ ] UI remains responsive with large JSON response (e.g. 1MB)
- [ ] History list with 100+ entries scrolls smoothly

## Reporting

Log failures with: OS version, build artifact name, and steps to reproduce. Update this checklist when new flows are added.
