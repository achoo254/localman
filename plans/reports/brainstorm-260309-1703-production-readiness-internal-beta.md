# Brainstorm — Production Readiness for Internal Beta

**Date:** 2026-03-09 | **Target:** Internal beta, Windows + macOS

---

## Problem Statement

Localman v0.1.0 is feature-complete (Phases 00–12). Need to ship internal beta to testers on Windows + macOS. Must identify minimum viable steps to go from "dev complete" to "installable beta."

---

## Evaluated Approaches

### Option A: Quick Ship (Recommended)
Fix lint error, build on both platforms, distribute directly.

**Pros:** Ship in 1-2 days. Testers find real bugs faster than automated tests.
**Cons:** No CI for macOS. Manual build process. No auto-updater.
**Risk:** Low — internal testers tolerate rough edges.

### Option B: Full Pipeline First
Set up CI/CD for both platforms, code signing, updater, then ship.

**Pros:** Professional distribution. Repeatable builds.
**Cons:** 1-2 weeks of infrastructure work before any tester touches the app.
**Risk:** Over-engineering for internal beta. YAGNI.

### Option C: Windows Only First
Ship Windows via GitLab CI (already working minus lint fix), macOS later.

**Pros:** Fastest. CI already builds MSI/EXE.
**Cons:** Misses macOS testing feedback. Developer audience skews Mac.
**Risk:** Medium — macOS bugs discovered late.

---

## Recommended Solution: Option A — Quick Ship

**Rationale:** Internal beta = speed over polish. Real user feedback > automated testing for finding what matters. Code signing and auto-updater are YAGNI for a handful of testers.

---

## Action Checklist (Ordered)

### Phase 1: Fix Blockers (30 min)
- [ ] Fix ESLint error: `app-layout.tsx:42` — setState in useEffect
- [ ] Fix 4 ESLint warnings (console.log, missing deps, unused directive)
- [ ] Run `pnpm lint && pnpm type-check && pnpm test --run` — all green

### Phase 2: Build Artifacts (1 hour)
- [ ] Windows: `pnpm tauri build` → produces `.msi` + `.exe` in `src-tauri/target/release/bundle/`
- [ ] macOS: `pnpm tauri build` on Mac → produces `.dmg` in same path
- [ ] Verify both installers launch and show main UI

### Phase 3: Smoke Test (30 min per platform)
- [ ] Launch app, verify dark theme renders
- [ ] Create new collection
- [ ] Create new request (GET https://httpbin.org/get)
- [ ] Send request, verify response displays (status, headers, body)
- [ ] Switch environment
- [ ] Import cURL command
- [ ] Open Settings, change a setting, verify persistence
- [ ] Check keyboard shortcuts (Ctrl/Cmd+Enter = Send, Ctrl/Cmd+T = New tab)
- [ ] Close and reopen — verify data persists (IndexedDB)

### Phase 4: Distribute (15 min)
- [ ] Upload .msi/.exe and .dmg to shared drive / GitLab release / cloud storage
- [ ] Write brief install instructions (Windows: run .msi; macOS: open .dmg, drag to Apps, right-click > Open to bypass Gatekeeper)
- [ ] Share with testers

---

## What to Skip for Internal Beta

| Item | Why Skip |
|------|----------|
| Code signing | Testers can bypass SmartScreen/Gatekeeper manually |
| Auto-updater | Distribute new builds manually; configure for public beta |
| macOS CI/CD | Build locally on Mac; automate later |
| Performance benchmarks | Testers will report perf issues organically |
| Full E2E suite | 41 unit tests + manual smoke test sufficient |
| Linux builds | Not needed for internal beta |

---

## What to Defer to Public Beta

1. **Code signing** — Windows EV cert ($300-500/yr) + Apple Developer ($99/yr)
2. **Auto-updater** — Configure Tauri updater endpoints (GitHub Releases or custom CDN)
3. **CI/CD for macOS** — GitHub Actions with `macos-latest` runner
4. **Performance baseline** — Cold startup <2s, idle memory <150MB on target hardware
5. **E2E test suite** — Playwright tests for critical flows
6. **Linux support** — AppImage/deb builds and testing

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Both platform builds succeed | Yes |
| Smoke test passes on both | Yes |
| Testers can install without assistance | Yes (with brief instructions) |
| No crash on launch | Yes |
| Core flow works (create → send → view response) | Yes |

---

## Risks

| Risk | Mitigation |
|------|------------|
| macOS build fails (untested) | Build early, fix Rust/Tauri issues before distributing |
| Gatekeeper blocks aggressively | Document right-click > Open workaround |
| IndexedDB data loss on update | Not a risk for beta (no prior data) |
| QuickJS WASM large bundle | Already gzipped to ~457KB; acceptable |

---

## Unresolved Questions

1. Where to host beta artifacts? (GitLab releases, shared drive, cloud?)
2. How many testers in internal beta? (Affects feedback collection process)
3. Any specific features testers should focus on?
