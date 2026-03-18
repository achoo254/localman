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
- [ ] Fonts: JetBrains Mono (code) and Inter (UI) render correctly
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

## Cloud Sync & Workspaces (all platforms)

- [ ] Login with Google OAuth successful
- [ ] Workspace creation + switching works
- [ ] Team member invite by email sends link
- [ ] Accept invite link adds user to workspace
- [ ] Collections filtered by active workspace
- [ ] Sync status badge shows connection state
- [ ] Push/pull sync completes without errors
- [ ] Offline mode activates when backend unavailable
- [ ] App continues functioning with local data

## WebSocket Real-Time (all platforms)

- [ ] Connect to WebSocket server after login
- [ ] Real-time entity updates broadcast to team members
- [ ] Presence avatars show online users
- [ ] Auto-reconnect triggers on network loss (exponential backoff)
- [ ] Presence state persists across reconnect
- [ ] State reconciliation via HTTP sync after reconnect

## Draft & Auto-Save (all platforms)

- [ ] Ctrl+T creates new draft tab (italic styling visible)
- [ ] Draft request stays in memory until explicit save
- [ ] Ctrl+S opens save dialog with collection picker
- [ ] Draft transitions to saved request after save
- [ ] Auto-save disabled for drafts
- [ ] Draft execution excluded from history
- [ ] Close draft tab shows unsaved warning (if dirty)

## Conflict Resolution (all platforms)

- [ ] Push with stale changes triggers conflict dialog
- [ ] Per-field picker shows local vs. remote values
- [ ] "Use All Local" and "Use All Remote" bulk actions work
- [ ] Auto-merged fields display as read-only
- [ ] Conflict resolution persists after next sync

## Performance (all platforms)

- [ ] Cold startup < 2s
- [ ] Idle memory < 150MB (after 5min idle)
- [ ] UI responsive with large JSON response (1MB+)
- [ ] History list with 1000+ entries scrolls smoothly
- [ ] WebSocket connection stable under 60 concurrent messages/10s
- [ ] IndexedDB quota warning appears near limit (~40MB / 50MB)

## Reporting

Log failures with: OS version, build artifact name, test area, and steps to reproduce. Update this checklist when new flows are added.
