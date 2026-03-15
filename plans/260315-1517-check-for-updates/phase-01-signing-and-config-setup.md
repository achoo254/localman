# Phase 1: Signing & Config Setup

## Context
- [Tauri Updater Research](../../backend/plans/reports/researcher-260315-1528-tauri-v2-updater-github-actions.md)
- [tauri.conf.json](../../src-tauri/tauri.conf.json)

## Overview
- **Priority:** P0
- **Status:** ✅ completed
- **Description:** Generate Ed25519 signing keypair, configure Tauri updater plugin with pubkey and endpoint, install JS binding.

## Requirements
- Ed25519 keypair for signing release binaries
- Tauri config with pubkey + GitHub Releases endpoint
- `@tauri-apps/plugin-updater` JS package installed
- `@tauri-apps/plugin-process` for relaunch capability

## Implementation Steps

### 1. Generate signing keys
```bash
pnpm tauri signer generate -w ~/.tauri/localman.key
```
- Saves private key: `~/.tauri/localman.key`
- Saves public key: `~/.tauri/localman.key.pub`
- **IMPORTANT:** Never commit private key to repo

### 2. Update tauri.conf.json
```json
{
  "plugins": {
    "updater": {
      "pubkey": "<contents of localman.key.pub>",
      "endpoints": [
        "https://github.com/{OWNER}/localman/releases/latest/download/latest.json"
      ]
    }
  }
}
```
- Replace `{OWNER}` with actual GitHub username/org once repo is created
- `pubkey` = full content of `.key.pub` file including BEGIN/END markers

### 3. Install JS dependencies
```bash
pnpm add @tauri-apps/plugin-updater @tauri-apps/plugin-process
```

### 4. Register process plugin in Rust (for relaunch)
File: `src-tauri/src/lib.rs`
```rust
.plugin(tauri_plugin_process::init())
```

Add to `src-tauri/Cargo.toml`:
```toml
tauri-plugin-process = "2"
```

### 5. Store private key for CI (later, Phase 3)
- GitHub repo → Settings → Secrets → Actions
- `TAURI_SIGNING_PRIVATE_KEY` = contents of `~/.tauri/localman.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = password used during generation

## Related Code Files
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `package.json` (new deps)

## Todo
- [x] Generate Ed25519 keypair
- [x] Add pubkey to tauri.conf.json
- [x] Set updater endpoints in tauri.conf.json
- [x] Install @tauri-apps/plugin-updater
- [x] Install @tauri-apps/plugin-process
- [x] Add tauri-plugin-process to Cargo.toml
- [x] Register process plugin in lib.rs
- [x] Verify `cargo check` passes
- [x] Verify `pnpm type-check` passes

## Success Criteria
- `cargo check` succeeds with both plugins
- `pnpm type-check` succeeds
- tauri.conf.json has valid pubkey and endpoint URL
- Private key stored securely (not in repo)

## Security Considerations
- Private key MUST NOT be committed to git
- Add `*.key` to `.gitignore` if not already
- Public key is safe to commit (embedded in tauri.conf.json)
