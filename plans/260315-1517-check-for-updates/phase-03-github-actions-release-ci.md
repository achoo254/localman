# Phase 3: GitHub Actions Release CI

## Context
- [Tauri Action Research](../../backend/plans/reports/researcher-260315-1528-tauri-v2-updater-github-actions.md)
- No existing GitHub Actions workflows in repo
- Current CI was on GitLab (gitlabs.inet.vn), migrating to GitHub

## Overview
- **Priority:** P0
- **Status:** pending
- **Description:** Create GitHub Actions workflow to build, sign, and release Tauri app for Windows/macOS/Linux on tag push.

## Key Insights
- `tauri-apps/tauri-action@v1` handles build + release + latest.json generation
- `uploadUpdaterJson: true` auto-generates platform manifest
- Single signing key works across all platforms
- Matrix strategy: one job per OS, all upload to same release

## Implementation Steps

### 1. Create release workflow
**File:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.create.outputs.id }}
    steps:
      - uses: actions/checkout@v4
      - name: Create release
        id: create
        uses: softprops/action-gh-release@v2
        with:
          draft: true
          generate_release_notes: true

  build:
    needs: create-release
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: windows-latest
            target: windows
          - os: macos-latest
            target: macos
          - os: ubuntu-latest
            target: linux
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install frontend dependencies
        run: pnpm install

      - name: Install Linux dependencies
        if: matrix.target == 'linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Build and release
        uses: tauri-apps/tauri-action@v1
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          uploadUpdaterJson: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

  publish-release:
    needs: [create-release, build]
    runs-on: ubuntu-latest
    steps:
      - name: Publish release
        uses: softprops/action-gh-release@v2
        with:
          draft: false
          tag_name: ${{ github.ref_name }}
```

### 2. Configure GitHub Secrets
Repository → Settings → Secrets and variables → Actions:
- `TAURI_SIGNING_PRIVATE_KEY` — private key content from Phase 1
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — password from key generation

### 3. macOS code signing (optional, future)
- Apple Developer Certificate for notarization
- Not required for updates to work, only for Gatekeeper
- Can add later with `APPLE_CERTIFICATE` secrets

## Related Code Files
- Create: `.github/workflows/release.yml`

## Todo
- [ ] Create `.github/workflows/release.yml`
- [ ] Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub Secrets
- [ ] Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to GitHub Secrets
- [ ] Test with a tag push: `git tag v0.1.0 && git push origin v0.1.0`
- [ ] Verify latest.json is uploaded to release assets
- [ ] Verify binaries are signed (.sig files present)
- [ ] Verify release contains all 3 platform binaries

## Success Criteria
- Tag push triggers multi-platform build
- All 3 platforms build successfully
- `latest.json` uploaded with correct platform keys and signatures
- Signed binaries (.sig files) present in release
- Release published (not draft) after all builds complete

## Risk Assessment
- macOS build may fail without Xcode setup → ubuntu/windows still succeed (fail-fast: false)
- Linux needs webkit2gtk system deps → installed in CI step
- Large build times (~15-20min per platform) → matrix runs in parallel
- GitHub Actions free tier: 2000 min/month → sufficient for releases
