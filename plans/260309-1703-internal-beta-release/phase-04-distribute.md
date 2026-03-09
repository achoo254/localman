# Phase 04 — Distribute

## Overview
- **Priority:** P2
- **Status:** Pending
- **Effort:** 30 min
- **Depends on:** Phase 03

Distribute beta builds to internal testers with install instructions.

## Distribution Options

| Method | Pros | Cons |
|--------|------|------|
| GitLab Release | Versioned, download links, changelog | Requires GitLab access |
| Shared Drive | Simple, no setup | Manual, no versioning |
| Cloud Storage (GDrive/S3) | Easy sharing | Manual upload |

**Recommendation:** GitLab Release (keeps everything in one place).

### GitLab Release via CLI

```bash
# Create release with artifacts
glab release create v0.1.0-beta.1 \
  --hostname gitlabs.inet.vn \
  --title "Localman v0.1.0 Beta 1" \
  --notes "Internal beta release for testing. See install instructions below." \
  ./localman-windows.msi \
  ./localman-windows.exe \
  ./localman-macos.dmg
```

Or use GitLab CI artifacts from `build-windows` job (auto-uploaded on `v*` tag).

## Install Instructions for Testers

### Windows
1. Download `localman_0.1.0_x64-setup.exe` or `.msi`
2. Run installer
3. If SmartScreen warning appears: click "More info" → "Run anyway"
4. Launch from Start Menu or Desktop shortcut

### macOS
1. Download `localman_0.1.0_aarch64.dmg` (Apple Silicon) or `_x64.dmg` (Intel)
2. Open DMG, drag Localman to Applications
3. First launch: right-click app → Open → click "Open" in dialog (Gatekeeper bypass)
4. Subsequent launches work normally

## Tester Communication

Share with testers:
- [ ] Download links (GitLab release URL or direct links)
- [ ] Install instructions (above)
- [ ] Known issues list (from Phase 03 bugs)
- [ ] Feedback channel (GitLab issues, Slack, email)
- [ ] Key areas to test (core workflow, import, environments)

## Todo

- [ ] Upload artifacts to chosen distribution method
- [ ] Write install instructions
- [ ] Share with testers
- [ ] Set up feedback collection channel

## Success Criteria

- Testers can download and install on both platforms
- Testers know how to report bugs
- At least 1 tester confirms successful install + basic usage
